import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import webpush from 'web-push';
import { pushSubscriptions } from '../db/schema';
import { type FakeIdp, startFakeIdp } from '../../test/fake-idp';
import { api, signIn } from '../../test/sign-in';
import { type TestServer, startTestServer } from '../../test/test-server';
import { MAX_PUSH_DEVICES } from './push-store';

const CLIENT_ID = 'tuvi-web';
const SECRET = 'test-secret-'.padEnd(40, 'x');
const birth = { name: 'Lan', calendar: 'solar', year: 1995, month: 3, day: 8, isLeapMonth: false, hour: 9, minute: 0, gender: 'female' } as const;

/** A subscription shaped like PushSubscription.toJSON() of a Chrome browser. */
function subscription(endpoint = `https://fcm.googleapis.com/fcm/send/${randomBytes(12).toString('base64url')}`): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  return { endpoint, keys: { p256dh: randomBytes(65).toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}

function subscribe(server: TestServer, cookie: string | undefined, body: unknown): Promise<Response> {
  return api(server, '/api/push/subscriptions', { method: 'POST', cookie, body: JSON.stringify(body) });
}

function unsubscribe(server: TestServer, cookie: string, endpoint: string): Promise<Response> {
  return api(server, '/api/push/subscriptions', { method: 'DELETE', cookie, body: JSON.stringify({ endpoint }) });
}

async function storedFor(server: TestServer, endpoint: string): Promise<Array<{ userId: string; locale: string }>> {
  return server.database.db
    .select({ userId: pushSubscriptions.userId, locale: pushSubscriptions.locale })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

describe('push reminder routes, push off (no VAPID keys)', () => {
  let idp: FakeIdp;
  let server: TestServer;
  beforeAll(async () => {
    idp = await startFakeIdp({ clientId: CLIENT_ID, clientSecret: SECRET, sub: 'push-off' });
    server = await startTestServer({ AUTH_ISSUER: idp.issuer, AUTH_CLIENT_SECRET: SECRET });
  });
  afterAll(async () => {
    await server.close();
    await idp.close();
  });

  it('serves no key and refuses to subscribe, but still lets a browser unsubscribe', async () => {
    const key = await api(server, '/api/push/key');
    expect(key.headers.get('cache-control')).toBe('no-store');
    expect(await key.json()).toEqual({ publicKey: null });
    const session = await signIn(server);
    await api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify(birth) });
    const res = await subscribe(server, session, { subscription: subscription(), locale: 'vi' });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'push-off' });
    expect((await unsubscribe(server, session, 'https://fcm.googleapis.com/fcm/send/x')).status).toBe(204);
  });
});

describe('push reminder routes, push on', () => {
  const vapid = webpush.generateVAPIDKeys();
  let idp: FakeIdp;
  let server: TestServer;

  async function signInWithChart(sub: string): Promise<string> {
    idp.setSub(sub);
    const session = await signIn(server);
    expect((await api(server, '/api/charts', { method: 'POST', cookie: session, body: JSON.stringify(birth) })).status).toBe(201);
    return session;
  }

  beforeAll(async () => {
    idp = await startFakeIdp({ clientId: CLIENT_ID, clientSecret: SECRET, sub: 'push-a' });
    server = await startTestServer({
      AUTH_ISSUER: idp.issuer,
      AUTH_CLIENT_SECRET: SECRET,
      VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
      VAPID_SUBJECT: 'mailto:noreply@hoandat.com',
    });
  });
  afterAll(async () => {
    await server.close();
    await idp.close();
  });

  it('serves the public key to anyone, never the private one', async () => {
    const text = await (await api(server, '/api/push/key')).text();
    expect(JSON.parse(text)).toEqual({ publicKey: vapid.publicKey });
    expect(text).not.toContain(vapid.privateKey);
  });

  it('keeps subscribing behind sign-in and the app\'s Origin', async () => {
    expect((await subscribe(server, undefined, { subscription: subscription(), locale: 'vi' })).status).toBe(401);
    const session = await signInWithChart('push-csrf');
    const crossSite = await fetch(`${server.origin}/api/push/subscriptions`, {
      method: 'POST',
      headers: { cookie: session, origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: subscription(), locale: 'vi' }),
    });
    expect(crossSite.status).toBe(403);
    const deleteCrossSite = await fetch(`${server.origin}/api/push/subscriptions`, {
      method: 'DELETE',
      headers: { cookie: session, origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/x' }),
    });
    expect(deleteCrossSite.status).toBe(403);
  });

  it('needs a saved chart: the reminder is about its quẻ', async () => {
    idp.setSub('push-no-chart');
    const session = await signIn(server);
    const res = await subscribe(server, session, { subscription: subscription(), locale: 'vi' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'no-chart' });
  });

  it('accepts only browser push services and well-formed keys', async () => {
    const session = await signInWithChart('push-shape');
    const bad = [
      { subscription: subscription('https://evil.example/push'), locale: 'vi' },
      { subscription: subscription('http://fcm.googleapis.com/fcm/send/x'), locale: 'vi' },
      { subscription: subscription('https://fcm.googleapis.com:8443/fcm/send/x'), locale: 'vi' },
      { subscription: subscription('https://127.0.0.1/push'), locale: 'vi' },
      { subscription: { ...subscription(), keys: { p256dh: 'short', auth: 'short' } }, locale: 'vi' },
      { subscription: subscription(), locale: 'fr' },
      { subscription: subscription() },
    ];
    for (const body of bad) {
      const res = await subscribe(server, session, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'bad-subscription' });
    }
    for (const endpoint of ['https://web.push.apple.com/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://wns2-sg2p.notify.windows.com/w/?token=abc']) {
      expect((await subscribe(server, session, { subscription: subscription(endpoint), locale: 'en' })).status).toBe(204);
    }
  });

  it('turns the reminder on and off for this browser, in the language it was turned on in', async () => {
    const session = await signInWithChart('push-toggle');
    const sub = subscription();
    expect((await subscribe(server, session, { subscription: sub, locale: 'vi' })).status).toBe(204);
    // Again from the same browser (a reload): still one row, the language follows the latest.
    expect((await subscribe(server, session, { subscription: sub, locale: 'en' })).status).toBe(204);
    expect(await storedFor(server, sub.endpoint)).toEqual([expect.objectContaining({ locale: 'en' })]);
    expect((await unsubscribe(server, session, sub.endpoint)).status).toBe(204);
    expect(await storedFor(server, sub.endpoint)).toEqual([]);
  });

  it('moves a browser to whoever turned the reminder on there last, and never removes another account\'s', async () => {
    const sub = subscription();
    const first = await signInWithChart('push-first');
    expect((await subscribe(server, first, { subscription: sub, locale: 'vi' })).status).toBe(204);
    const [before] = await storedFor(server, sub.endpoint);
    const second = await signInWithChart('push-second');
    // Another account cannot take it off.
    expect((await unsubscribe(server, second, sub.endpoint)).status).toBe(204);
    expect(await storedFor(server, sub.endpoint)).toHaveLength(1);
    expect((await subscribe(server, second, { subscription: sub, locale: 'vi' })).status).toBe(204);
    const [after] = await storedFor(server, sub.endpoint);
    expect(after?.userId).not.toBe(before?.userId);
  });

  it(`stops at ${MAX_PUSH_DEVICES} browsers per account`, async () => {
    const session = await signInWithChart('push-many');
    const subs = Array.from({ length: MAX_PUSH_DEVICES }, () => subscription());
    for (const sub of subs) expect((await subscribe(server, session, { subscription: sub, locale: 'vi' })).status).toBe(204);
    const over = await subscribe(server, session, { subscription: subscription(), locale: 'vi' });
    expect(over.status).toBe(409);
    expect(await over.json()).toEqual({ error: 'too-many-devices' });
    // A browser already on the list may still renew.
    expect((await subscribe(server, session, { subscription: subs[0], locale: 'vi' })).status).toBe(204);
  });
});
