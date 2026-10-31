import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { type FakeIdp, startFakeIdp } from '../test/fake-idp';
import { type TestServer, startTestServer } from '../test/test-server';
import { MAX_CHARTS_PER_USER } from './charts/chart-store';

const CLIENT_ID = 'tuvi-web';
const SECRET = 'test-secret-'.padEnd(40, 'x');
const PROFILE_A = { name: 'Nguyễn Văn A', email: 'a@example.com', picture: 'https://lh3.googleusercontent.com/a/photo', telegram_linked: false };

const birth = {
  name: 'Bé Na',
  calendar: 'lunar',
  year: 1985,
  month: 2,
  day: 5,
  isLeapMonth: true,
  hour: 23,
  minute: 15,
  gender: 'female',
} as const;

/** Set-Cookie header of a response, as the `name=value` the next request sends. */
function cookieFrom(res: Response, name: string): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  if (!header) throw new Error(`no ${name} cookie`);
  return header.split(';')[0] ?? '';
}

function location(res: Response): string {
  const value = res.headers.get('location');
  if (!value) throw new Error(`no redirect (status ${res.status})`);
  return value;
}

/** The whole browser round trip through the fake IdP; returns the session cookie. */
async function signIn(server: TestServer): Promise<string> {
  const start = await fetch(`${server.origin}/auth/login?return=/saved`, { redirect: 'manual' });
  expect(start.status).toBe(302);
  const authorize = new URL(location(start));
  expect(authorize.searchParams.get('scope')).toBe('openid profile email');
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorize.searchParams.get('redirect_uri')).toBe(`${server.origin}/auth/callback`);
  const loginCookie = cookieFrom(start, 'tuvi_login');
  const consent = await fetch(authorize, { redirect: 'manual' });
  const callback = await fetch(location(consent), { redirect: 'manual', headers: { cookie: loginCookie } });
  expect(location(callback)).toBe('/saved');
  return cookieFrom(callback, 'tuvi_session');
}

function api(server: TestServer, path: string, init: RequestInit & { cookie?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('origin', server.origin);
  if (init.cookie) headers.set('cookie', init.cookie);
  if (init.body) headers.set('content-type', 'application/json');
  return fetch(`${server.origin}${path}`, { ...init, headers });
}

describe('without sign-in configured', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startTestServer();
  });
  afterAll(async () => {
    await server.close();
  });

  it('answers the health check', async () => {
    const res = await fetch(`${server.origin}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('reports sign-in as unavailable and sends /auth/login back with a notice', async () => {
    expect(await (await fetch(`${server.origin}/api/session`)).json()).toEqual({ signedIn: false, signInAvailable: false });
    const res = await fetch(`${server.origin}/auth/login?return=/`, { redirect: 'manual' });
    expect(location(res)).toBe('/?login=unavailable');
  });

  it('keeps saved charts behind sign-in', async () => {
    expect((await api(server, '/api/charts')).status).toBe(401);
    const res = await api(server, '/api/charts', { method: 'POST', body: JSON.stringify(birth) });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'sign-in-required' });
  });

  it('answers unknown API paths with a JSON 404', async () => {
    const res = await fetch(`${server.origin}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not-found' });
  });
});

describe('signed in through the hoandat.com account', () => {
  let idp: FakeIdp;
  let server: TestServer;

  beforeAll(async () => {
    idp = await startFakeIdp({ clientId: CLIENT_ID, clientSecret: SECRET, sub: 'account-a', profile: PROFILE_A });
    server = await startTestServer({ AUTH_ISSUER: idp.issuer, AUTH_CLIENT_SECRET: SECRET });
  });
  afterAll(async () => {
    await server.close();
    await idp.close();
  });

  it('opens a session from Code + PKCE and ends it on logout', async () => {
    const session = await signIn(server);
    expect(session).toMatch(/^tuvi_session=[A-Za-z0-9_-]{43}$/);
    expect(await (await api(server, '/api/session', { cookie: session })).json()).toEqual({
      signedIn: true,
      signInAvailable: true,
      user: { name: 'Nguyễn Văn A', email: 'a@example.com', picture: 'https://lh3.googleusercontent.com/a/photo' },
    });
    const logout = await api(server, '/auth/logout', { method: 'POST', cookie: session });
    expect(logout.status).toBe(204);
    expect(await (await api(server, '/api/session', { cookie: session })).json()).toMatchObject({ signedIn: false });
  });

  it('keeps the name, email and picture of the latest sign-in, and the stored ones when userinfo fails', async () => {
    const session = (cookie: string): Promise<unknown> => api(server, '/api/session', { cookie }).then((res) => res.json());
    idp.setSub('account-profile');
    try {
      // No picture and no name at the IdP: the username stands in, the picture is cleared.
      idp.setProfile({ preferred_username: 'van-b', email: 'b@example.com', picture: 'http://insecure.example/b.png' });
      expect(await session(await signIn(server))).toMatchObject({ user: { name: 'van-b', email: 'b@example.com', picture: null } });
      idp.setProfile({ name: 'Văn B', email: 'b@example.com', picture: 'https://avatars.githubusercontent.com/u/1' });
      const second = await signIn(server);
      expect(await session(second)).toMatchObject({ user: { name: 'Văn B', picture: 'https://avatars.githubusercontent.com/u/1' } });
      // Userinfo down: sign-in still works, the profile stays as it was.
      idp.failUserinfo(true);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(await session(await signIn(server))).toMatchObject({ user: { name: 'Văn B', email: 'b@example.com' } });
        expect(warn).toHaveBeenCalledWith('userinfo not used', 500);
      } finally {
        warn.mockRestore();
      }
    } finally {
      idp.failUserinfo(false);
      idp.setProfile(PROFILE_A);
      idp.setSub('account-a');
    }
  });

  it('rejects a callback without the login cookie or with another state', async () => {
    const start = await fetch(`${server.origin}/auth/login`, { redirect: 'manual' });
    const consent = await fetch(location(start), { redirect: 'manual' });
    const noCookie = await fetch(location(consent), { redirect: 'manual' });
    expect(location(noCookie)).toBe('/?login=fail');
    expect(noCookie.headers.getSetCookie().some((c) => c.startsWith('tuvi_session='))).toBe(false);

    const again = await fetch(`${server.origin}/auth/login`, { redirect: 'manual' });
    const wrongState = new URL(location(await fetch(location(again), { redirect: 'manual' })));
    wrongState.searchParams.set('state', 'forged');
    const forged = await fetch(wrongState, { redirect: 'manual', headers: { cookie: cookieFrom(again, 'tuvi_login') } });
    expect(location(forged)).toBe('/?login=fail');
  });

  it('saves, lists and deletes charts; keeps only what was entered', async () => {
    const session = await signIn(server);
    const saved = await api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify(birth) });
    expect(saved.status).toBe(201);
    const { chart } = (await saved.json()) as { chart: { id: string; input: unknown } };
    expect(chart.input).toEqual(birth);

    const list = (await (await api(server, '/api/charts', { cookie: session })).json()) as { charts: Array<{ id: string }> };
    expect(list.charts.map((c) => c.id)).toEqual([chart.id]);

    expect((await api(server, `/api/charts/${chart.id}`, { method: 'DELETE', cookie: session })).status).toBe(204);
    expect((await api(server, `/api/charts/${chart.id}`, { method: 'DELETE', cookie: session })).status).toBe(404);
    expect((await api(server, '/api/charts/not-a-uuid', { method: 'DELETE', cookie: session })).status).toBe(404);
  });

  it('rejects charts with dates that do not exist or fields that do not belong', async () => {
    const session = await signIn(server);
    const post = (body: unknown): Promise<Response> => api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify(body) });
    expect(await (await post({ ...birth, calendar: 'solar', month: 2, day: 30, isLeapMonth: false })).json()).toEqual({ error: 'invalid-date' });
    expect(await (await post({ ...birth, year: 1984, month: 10, day: 1, isLeapMonth: true })).json()).toEqual({ error: 'invalid-date' });
    expect((await post({ ...birth, extra: 1 })).status).toBe(400);
    expect((await post({ ...birth, name: 'x'.repeat(61) })).status).toBe(400);
    const malformed = await api(server, '/api/charts', { method: 'POST', cookie: session, body: '{' });
    expect(malformed.status).toBe(400);
  });

  it('keeps the daily quẻ streak behind sign-in and records today\'s draw once', async () => {
    expect((await api(server, '/api/que')).status).toBe(401);
    expect((await api(server, '/api/que/draw', { method: 'POST' })).status).toBe(401);
    idp.setSub('account-que');
    try {
      const session = await signIn(server);
      const before = (await (await api(server, '/api/que', { cookie: session })).json()) as { day: string; streak: number; drawnToday: boolean };
      expect(before).toMatchObject({ streak: 0, drawnToday: false });
      expect(before.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (let i = 0; i < 2; i++) {
        const draw = await api(server, '/api/que/draw', { method: 'POST', cookie: session });
        expect(draw.status).toBe(200);
        expect(await draw.json()).toEqual({ day: before.day, streak: 1, drawnToday: true });
      }
      expect(await (await api(server, '/api/que', { cookie: session })).json()).toEqual({ day: before.day, streak: 1, drawnToday: true });
    } finally {
      idp.setSub('account-a');
    }
  });

  it('refuses state changes from another origin (CSRF)', async () => {
    const session = await signIn(server);
    const crossSite = await fetch(`${server.origin}/api/charts`, {
      method: 'POST',
      headers: { cookie: session, origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify(birth),
    });
    expect(crossSite.status).toBe(403);
    const noOrigin = await fetch(`${server.origin}/auth/logout`, { method: 'POST', headers: { cookie: session } });
    expect(noOrigin.status).toBe(403);
  });

  it(`stops at ${MAX_CHARTS_PER_USER} charts per account`, async () => {
    idp.setSub('account-limit');
    const session = await signIn(server);
    idp.setSub('account-a');
    for (let i = 0; i < MAX_CHARTS_PER_USER; i++) {
      const res = await api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify({ ...birth, name: `#${i}` }) });
      expect(res.status).toBe(201);
    }
    const over = await api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify(birth) });
    expect(over.status).toBe(409);
    expect(await over.json()).toEqual({ error: 'chart-limit' });
  });

  it("never shows or deletes another account's chart", async () => {
    const a = await signIn(server);
    const { chart } = (await (await api(server, '/api/charts', { method: 'POST', cookie: a, body: JSON.stringify(birth) })).json()) as { chart: { id: string } };
    idp.setSub('account-b');
    const b = await signIn(server);
    idp.setSub('account-a');
    const listB = (await (await api(server, '/api/charts', { cookie: b })).json()) as { charts: Array<{ id: string }> };
    expect(listB.charts.some((c) => c.id === chart.id)).toBe(false);
    expect((await api(server, `/api/charts/${chart.id}`, { method: 'DELETE', cookie: b })).status).toBe(404);
    // Still there for its owner.
    const listA = (await (await api(server, '/api/charts', { cookie: a })).json()) as { charts: Array<{ id: string }> };
    expect(listA.charts.some((c) => c.id === chart.id)).toBe(true);
  });
});

describe('sign-in limits and session hygiene', () => {
  let idp: FakeIdp;
  let server: TestServer;

  beforeAll(async () => {
    idp = await startFakeIdp({ clientId: CLIENT_ID, clientSecret: SECRET, sub: 'account-c' });
    server = await startTestServer({ AUTH_ISSUER: idp.issuer, AUTH_CLIENT_SECRET: SECRET }, { signInLimitPer15Min: 3 });
  });
  afterAll(async () => {
    await server.close();
    await idp.close();
  });

  it('replaces the browser’s previous session when it signs in again', async () => {
    const first = await signIn(server);
    const start = await fetch(`${server.origin}/auth/login?return=/saved`, { redirect: 'manual' });
    const consent = await fetch(location(start), { redirect: 'manual' });
    const callback = await fetch(location(consent), { redirect: 'manual', headers: { cookie: `${cookieFrom(start, 'tuvi_login')}; ${first}` } });
    const second = cookieFrom(callback, 'tuvi_session');
    expect(second).not.toBe(first);
    expect(await (await api(server, '/api/session', { cookie: first })).json()).toMatchObject({ signedIn: false });
    expect(await (await api(server, '/api/session', { cookie: second })).json()).toMatchObject({ signedIn: true });
  });

  it('sends a start over the limit back to the page with a notice, not a bare 429', async () => {
    // Two starts were used above (limit 3 per window).
    expect((await fetch(`${server.origin}/auth/login?return=/`, { redirect: 'manual' })).status).toBe(302);
    const over = await fetch(`${server.origin}/auth/login?return=/credits`, { redirect: 'manual' });
    expect(over.status).toBe(302);
    expect(location(over)).toBe('/credits?login=busy');
  });
});

describe('logging a failed query', () => {
  let idp: FakeIdp;
  let server: TestServer;

  beforeAll(async () => {
    idp = await startFakeIdp({ clientId: CLIENT_ID, clientSecret: SECRET, sub: 'account-d' });
    server = await startTestServer({ AUTH_ISSUER: idp.issuer, AUTH_CLIENT_SECRET: SECRET });
  });
  afterAll(async () => {
    await server.close();
    await idp.close();
  });

  it('never writes the chart’s name or birth data to the log', async () => {
    const session = await signIn(server);
    // Break the insert only (the count before it still works), so the failing query carries the birth data.
    await server.database.db.execute(sql`alter table charts rename column name to name_broken`);
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    try {
      const res = await api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify(birth) });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'internal' });
    } finally {
      spy.mockRestore();
    }
    const text = logged.join('\n');
    expect(text).toContain('request failed');
    expect(text).toContain('query failed');
    expect(text).not.toContain('Bé Na');
    expect(text).not.toContain('1985');
  });
});
