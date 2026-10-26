/**
 * The pure parts of "sign in with a hoandat.com account" (OpenID Connect Code + PKCE against auth-next,
 * client `tuvi-web`, scope `openid`): the signed state cookie and the ID token checks. Tử Vi only needs the
 * account's `sub`. The ID token comes straight from the token endpoint over TLS with client authentication,
 * so its signature is not re-checked here (OIDC Core 3.1.3.7, step 6); issuer, audience, expiry and nonce are.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const LoginStateSchema = z.object({
  state: z.string().min(1),
  nonce: z.string().min(1),
  verifier: z.string().min(43),
  /** Same-site path the person goes back to after signing in. */
  returnTo: z.string(),
  /** Unix seconds after which the attempt is void. */
  exp: z.number().int(),
});

export type LoginState = z.infer<typeof LoginStateSchema>;

const LOGIN_TTL_SECONDS = 600;
const b64url = (buf: Buffer): string => buf.toString('base64url');

/** A same-site path to return to, or "/" for anything else (open-redirect guard). */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value.length <= 200 ? value : '/';
}

export function newLoginState(returnTo: string, now = Date.now()): LoginState {
  return {
    state: b64url(randomBytes(16)),
    nonce: b64url(randomBytes(16)),
    verifier: b64url(randomBytes(32)),
    returnTo: safeReturnPath(returnTo),
    exp: Math.floor(now / 1000) + LOGIN_TTL_SECONDS,
  };
}

/** S256 code challenge of the PKCE verifier (RFC 7636 §4.2). */
export function codeChallenge(verifier: string): string {
  return b64url(createHash('sha256').update(verifier).digest());
}

/** The state as a cookie value, signed with the client secret. */
export function sealState(state: LoginState, key: string): string {
  const body = b64url(Buffer.from(JSON.stringify(state)));
  const mac = b64url(createHmac('sha256', key).update(body).digest());
  return `${body}.${mac}`;
}

export function openState(value: string | undefined, key: string, now = Date.now()): LoginState | null {
  if (!value) return null;
  const [body, mac, extra] = value.split('.');
  if (!body || !mac || extra !== undefined) return null;
  const want = Buffer.from(b64url(createHmac('sha256', key).update(body).digest()));
  const got = Buffer.from(mac);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return null;
  }
  const parsed = LoginStateSchema.safeParse(json);
  return parsed.success && parsed.data.exp > Math.floor(now / 1000) ? parsed.data : null;
}

/** The account `sub` from the ID token, or null when any check fails. */
export function subFromIdToken(idToken: string, expect: { issuer: string; clientId: string; nonce: string }, now = Date.now()): string | null {
  const part = idToken.split('.')[1];
  if (!part) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(part, 'base64url').toString());
  } catch {
    return null;
  }
  if (typeof claims !== 'object' || claims === null) return null;
  const { iss, aud, exp, nonce, sub } = claims as Record<string, unknown>;
  const audOk = Array.isArray(aud) ? aud.includes(expect.clientId) : aud === expect.clientId;
  const fresh = typeof exp === 'number' && exp > Math.floor(now / 1000);
  if (iss !== expect.issuer || !audOk || !fresh || nonce !== expect.nonce || typeof sub !== 'string' || sub === '') return null;
  return sub;
}
