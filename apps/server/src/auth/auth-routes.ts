/**
 * Sign-in with a hoandat.com account (BFF): /auth/login sends the browser to auth-next (Code + PKCE, scope
 * openid), /auth/callback exchanges the code server-side with client_secret_basic and opens the app's own
 * session; POST /auth/logout ends it. GET /api/session tells the web app whether it is signed in.
 */
import express, { type Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { AuthConfig, ServerConfig } from '../config';
import type { Db } from '../db/client';
import { codeChallenge, newLoginState, openState, safeReturnPath, sealState, subFromIdToken } from './oidc-login';
import { clearSessionCookie, readCookie, readSessionToken, setSessionCookie } from './session-cookie';
import { createSession, deleteSessionByToken, findSession, upsertUser } from './session-store';

const LOGIN_COOKIE = 'tuvi_login';
const DISCOVERY_TTL_MS = 60 * 60 * 1000;
const IDP_TIMEOUT_MS = 10_000;

const DiscoverySchema = z.object({
  issuer: z.string().min(1),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
});
type Discovery = z.infer<typeof DiscoverySchema>;

const TokenResponseSchema = z.object({ id_token: z.string().min(1) });

export interface AuthRoutesOptions {
  config: ServerConfig;
  db: Db;
  now: () => Date;
}

/** The IdP's discovery document, cached for an hour. */
function discoveryClient(auth: AuthConfig): () => Promise<Discovery> {
  let cached: { at: number; doc: Discovery } | null = null;
  return async () => {
    if (cached && Date.now() - cached.at < DISCOVERY_TTL_MS) return cached.doc;
    const res = await fetch(`${auth.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(IDP_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`discovery answered ${res.status}`);
    const doc = DiscoverySchema.parse(await res.json());
    if (doc.issuer !== auth.issuer) throw new Error('discovery issuer does not match AUTH_ISSUER');
    cached = { at: Date.now(), doc };
    return doc;
  };
}

/** `?login=<result>` on the return path, so the page can say what happened. */
function withLoginResult(path: string, result: 'fail' | 'unavailable'): string {
  const url = new URL(path, 'http://app.invalid');
  url.searchParams.set('login', result);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function authRoutes({ config, db, now }: AuthRoutesOptions): Router {
  const router = express.Router();
  const { auth } = config;
  const discover = auth ? discoveryClient(auth) : null;
  const secure = config.nodeEnv === 'production';
  const signInLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.signInLimitPer15Min, standardHeaders: 'draft-8', legacyHeaders: false });

  router.get('/api/session', async (req, res) => {
    const token = readSessionToken(req, config);
    const session = token ? await findSession(db, token, now()) : null;
    res.set('Cache-Control', 'no-store').json({ signedIn: session !== null, signInAvailable: auth !== null });
  });

  router.get('/auth/login', signInLimit, async (req, res) => {
    const returnTo = safeReturnPath(req.query.return);
    if (!auth || !discover) {
      res.redirect(withLoginResult(returnTo, 'unavailable'));
      return;
    }
    const lang = req.query.lang === 'en' ? 'en' : 'vi';
    try {
      const doc = await discover();
      const state = newLoginState(returnTo, now().getTime());
      res.cookie(LOGIN_COOKIE, sealState(state, auth.clientSecret), { httpOnly: true, secure, sameSite: 'lax', path: '/auth', maxAge: 600_000 });
      const url = new URL(doc.authorization_endpoint);
      url.search = new URLSearchParams({
        client_id: auth.clientId,
        redirect_uri: auth.redirectUri,
        response_type: 'code',
        scope: 'openid',
        state: state.state,
        nonce: state.nonce,
        code_challenge: codeChallenge(state.verifier),
        code_challenge_method: 'S256',
        ui_locales: lang,
      }).toString();
      res.redirect(url.href);
    } catch (error) {
      console.warn('sign-in start failed', error instanceof Error ? error.message : typeof error);
      res.redirect(withLoginResult(returnTo, 'fail'));
    }
  });

  router.get('/auth/callback', signInLimit, async (req, res) => {
    const state = auth ? openState(readCookie(req, LOGIN_COOKIE), auth.clientSecret, now().getTime()) : null;
    res.clearCookie(LOGIN_COOKIE, { httpOnly: true, secure, sameSite: 'lax', path: '/auth' });
    const fail = (): void => res.redirect(withLoginResult(state?.returnTo ?? '/', 'fail'));
    const code = req.query.code;
    if (!auth || !discover || !state || req.query.state !== state.state || typeof code !== 'string' || code === '') {
      fail();
      return;
    }
    try {
      const doc = await discover();
      const basic = Buffer.from(`${encodeURIComponent(auth.clientId)}:${encodeURIComponent(auth.clientSecret)}`).toString('base64');
      const tokenRes = await fetch(doc.token_endpoint, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: auth.redirectUri, code_verifier: state.verifier }),
        signal: AbortSignal.timeout(IDP_TIMEOUT_MS),
      });
      const body = TokenResponseSchema.safeParse(await tokenRes.json().catch(() => null));
      const sub =
        tokenRes.ok && body.success ? subFromIdToken(body.data.id_token, { issuer: doc.issuer, clientId: auth.clientId, nonce: state.nonce }, now().getTime()) : null;
      if (!sub) {
        console.warn('sign-in rejected', tokenRes.status);
        fail();
        return;
      }
      const at = now();
      const userId = await upsertUser(db, sub, at);
      setSessionCookie(res, config, await createSession(db, userId, at));
      res.redirect(state.returnTo);
    } catch (error) {
      console.warn('sign-in failed', error instanceof Error ? error.message : typeof error);
      fail();
    }
  });

  // Same-origin check applies (app.ts): a cross-site page cannot sign the person out.
  router.post('/auth/logout', async (req, res) => {
    const token = readSessionToken(req, config);
    if (token) await deleteSessionByToken(db, token);
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  return router;
}
