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
});
