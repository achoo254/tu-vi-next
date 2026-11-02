import { z } from 'zod';

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
export const DEFAULT_ISSUER = 'https://auth.hoandat.com';
export const DEFAULT_CLIENT_ID = 'tuvi-web';

/** An env line with nothing after `=` counts as not set. */
const emptyIsUnset = (value: unknown): unknown => (value === '' ? undefined : value);

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5290),
  /** Public origin of the app; the sign-in callback is PUBLIC_URL/auth/callback. */
  PUBLIC_URL: z.preprocess(emptyIsUnset, z.url().default('http://localhost:5291')),
  DATABASE_URL: z.preprocess(emptyIsUnset, z.url().optional()),
  /** PGlite directory when DATABASE_URL is unset; `memory` keeps it in RAM (E2E starts from an empty database). */
  PGLITE_DIR: z.preprocess(emptyIsUnset, z.string().min(1).optional()),
  AUTH_ISSUER: z.preprocess(emptyIsUnset, z.url().default(DEFAULT_ISSUER)),
  AUTH_CLIENT_ID: z.preprocess(emptyIsUnset, z.string().min(1).default(DEFAULT_CLIENT_ID)),
  /** Secret of the confidential client tuvi-web. Unset: sign-in is off (the app still casts charts). */
  AUTH_CLIENT_SECRET: z.preprocess(emptyIsUnset, z.string().min(32).optional()),
  /** Web Push (VAPID) for the daily quẻ reminder: the key pair and the sender's contact. All three or none (push off). */
  VAPID_PUBLIC_KEY: z.preprocess(emptyIsUnset, z.string().regex(/^[A-Za-z0-9_-]{80,100}$/).optional()),
  VAPID_PRIVATE_KEY: z.preprocess(emptyIsUnset, z.string().regex(/^[A-Za-z0-9_-]{40,50}$/).optional()),
  VAPID_SUBJECT: z.preprocess(emptyIsUnset, z.string().regex(/^(mailto:\S+@\S+|https:\/\/\S+)$/).optional()),
});

export interface AuthConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Web Push of the daily quẻ reminder. */
export interface PushConfig {
  /** Public key (base64url) browsers subscribe with; served by GET /api/push/key. */
  publicKey: string;
  privateKey: string;
  /** `mailto:` or `https:` contact the push services may use to reach the sender. */
  subject: string;
}

export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  /** Origin of the web app: the only origin allowed to make state-changing requests (CSRF check). */
  publicOrigin: string;
  databaseUrl: string | undefined;
  /** PGlite location when no DATABASE_URL: a directory, null for in-memory, undefined for the dev default. */
  pgliteDir: string | null | undefined;
  /** Sign-in through the hoandat.com account; null when AUTH_CLIENT_SECRET is not set. */
  auth: AuthConfig | null;
  /**
   * Sign-in starts per 15 minutes per IP. Generous: mobile carriers put many people behind one address, and the
   * real client IP is the one nginx forwards (Cloudflare's real-IP restore is global on the host).
   */
  signInLimitPer15Min: number;
  /** The daily quẻ reminder by Web Push; null (off, nothing runs) when the VAPID keys are not set. */
  push: PushConfig | null;
}

/** Env keys that only work together: all set or none; some set is a startup error naming the rest. */
function requireAllOrNone(group: string, values: Record<string, string | undefined>): void {
  const missing = Object.keys(values).filter((key) => values[key] === undefined);
  if (missing.length > 0 && missing.length < Object.keys(values).length) {
    throw new Error(`Invalid server env: ${group} needs ${missing.join(', ')} too`);
  }
}

/** Validates env once at startup; throws naming the offending keys so the process fails fast. */
export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
  }
  const e = parsed.data;
  const production = e.NODE_ENV === 'production';
  const publicUrl = new URL(e.PUBLIC_URL);
  const issuerUrl = new URL(e.AUTH_ISSUER);
  if (production) {
    const missing = [!e.DATABASE_URL && 'DATABASE_URL', !e.AUTH_CLIENT_SECRET && 'AUTH_CLIENT_SECRET'].filter(Boolean);
    if (missing.length > 0) throw new Error(`Invalid server env: ${missing.join(', ')} required in production`);
    if (publicUrl.protocol !== 'https:') throw new Error('Invalid server env: PUBLIC_URL must be https in production');
    if (e.PGLITE_DIR) throw new Error('Invalid server env: PGLITE_DIR is dev/test only');
  }
  // https only; plain http only for a local fake IdP outside production (E2E).
  if (issuerUrl.protocol !== 'https:' && (production || issuerUrl.protocol !== 'http:' || !LOOPBACK_HOSTS.includes(issuerUrl.hostname))) {
    throw new Error('Invalid server env: AUTH_ISSUER must be https (http only on loopback outside production)');
  }
  // The code exchange is only as trustworthy as the TLS it travels over.
  if (e.AUTH_CLIENT_SECRET && env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('Invalid server env: NODE_TLS_REJECT_UNAUTHORIZED=0 is not allowed with sign-in');
  }
  requireAllOrNone('Web Push', { VAPID_PUBLIC_KEY: e.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: e.VAPID_PRIVATE_KEY, VAPID_SUBJECT: e.VAPID_SUBJECT });
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    publicOrigin: publicUrl.origin,
    databaseUrl: e.DATABASE_URL,
    pgliteDir: e.PGLITE_DIR === 'memory' ? null : e.PGLITE_DIR,
    auth: e.AUTH_CLIENT_SECRET
      ? {
          issuer: issuerUrl.href.replace(/\/$/, ''),
          clientId: e.AUTH_CLIENT_ID,
          clientSecret: e.AUTH_CLIENT_SECRET,
          redirectUri: `${publicUrl.origin}/auth/callback`,
        }
      : null,
    signInLimitPer15Min: 100,
    push:
      e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY && e.VAPID_SUBJECT
        ? { publicKey: e.VAPID_PUBLIC_KEY, privateKey: e.VAPID_PRIVATE_KEY, subject: e.VAPID_SUBJECT }
        : null,
  };
}
