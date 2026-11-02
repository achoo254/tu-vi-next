import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const SECRET = 's'.repeat(40);

describe('server config', () => {
  it('runs in dev with defaults: PGlite, sign-in off', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ nodeEnv: 'development', port: 5290, publicOrigin: 'http://localhost:5291', databaseUrl: undefined, auth: null });
  });

  it('derives the callback from PUBLIC_URL', () => {
    const config = loadConfig({ PUBLIC_URL: 'https://tuvi.hoandat.com', AUTH_CLIENT_SECRET: SECRET });
    expect(config.auth).toEqual({
      issuer: 'https://auth.hoandat.com',
      clientId: 'tuvi-web',
      clientSecret: SECRET,
      redirectUri: 'https://tuvi.hoandat.com/auth/callback',
    });
  });

  it('requires Postgres, sign-in and https in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL, AUTH_CLIENT_SECRET/);
    const prod = { NODE_ENV: 'production', DATABASE_URL: 'postgres://tuvi@127.0.0.1/tuvi', AUTH_CLIENT_SECRET: SECRET };
    expect(() => loadConfig({ ...prod, PUBLIC_URL: 'http://tuvi.hoandat.com' })).toThrow(/https/);
    expect(loadConfig({ ...prod, PUBLIC_URL: 'https://tuvi.hoandat.com' }).auth?.redirectUri).toBe('https://tuvi.hoandat.com/auth/callback');
  });

  it('accepts a plain-http issuer only on loopback outside production', () => {
    expect(loadConfig({ AUTH_ISSUER: 'http://127.0.0.1:5295', AUTH_CLIENT_SECRET: SECRET }).auth?.issuer).toBe('http://127.0.0.1:5295');
    expect(() => loadConfig({ AUTH_ISSUER: 'http://auth.example', AUTH_CLIENT_SECRET: SECRET })).toThrow(/AUTH_ISSUER/);
  });

  it('rejects a short secret and disabled TLS checks', () => {
    expect(() => loadConfig({ AUTH_CLIENT_SECRET: 'short' })).toThrow(/AUTH_CLIENT_SECRET/);
    expect(() => loadConfig({ AUTH_CLIENT_SECRET: SECRET, NODE_TLS_REJECT_UNAUTHORIZED: '0' })).toThrow(/TLS/);
  });

  it('keeps push off without the VAPID keys, on with all three, and refuses to start with only some', () => {
    const vapid = {
      VAPID_PUBLIC_KEY: 'B'.repeat(87),
      VAPID_PRIVATE_KEY: 'p'.repeat(43),
      VAPID_SUBJECT: 'mailto:noreply@hoandat.com',
    };
    expect(loadConfig({}).push).toBeNull();
    expect(loadConfig({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '' }).push).toBeNull();
    expect(loadConfig(vapid).push).toEqual({ publicKey: vapid.VAPID_PUBLIC_KEY, privateKey: vapid.VAPID_PRIVATE_KEY, subject: vapid.VAPID_SUBJECT });
    expect(loadConfig({ ...vapid, VAPID_SUBJECT: 'https://tuvi.hoandat.com' }).push?.subject).toBe('https://tuvi.hoandat.com');
    expect(() => loadConfig({ VAPID_PUBLIC_KEY: vapid.VAPID_PUBLIC_KEY })).toThrow(/Web Push needs VAPID_PRIVATE_KEY, VAPID_SUBJECT too/);
    expect(() => loadConfig({ ...vapid, VAPID_SUBJECT: '' })).toThrow(/VAPID_SUBJECT too/);
    expect(() => loadConfig({ ...vapid, VAPID_SUBJECT: 'noreply@hoandat.com' })).toThrow(/VAPID_SUBJECT/);
    expect(() => loadConfig({ ...vapid, VAPID_PRIVATE_KEY: 'not a key' })).toThrow(/VAPID_PRIVATE_KEY/);
  });

  it('never puts the VAPID private key in an error', () => {
    const privateKey = 'q'.repeat(43);
    try {
      loadConfig({ VAPID_PRIVATE_KEY: privateKey });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(privateKey);
    }
  });
});
