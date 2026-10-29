import { useEffect, useState } from 'react';
import * as z from 'zod/mini';
import { apiFetch } from './api-client';

/** The signed-in account as the IdP named it at the latest sign-in; any field may be null. */
const SessionUserSchema = z.object({ name: z.nullable(z.string()), email: z.nullable(z.string()), picture: z.nullable(z.string()) });
export type SessionUser = z.infer<typeof SessionUserSchema>;

const SessionSchema = z.object({ signedIn: z.boolean(), signInAvailable: z.boolean(), user: z.optional(SessionUserSchema) });
export type SessionInfo = z.infer<typeof SessionSchema>;

export type SessionState = { status: 'loading' } | ({ status: 'ready' } & SessionInfo);

export async function fetchSession(): Promise<SessionInfo> {
  return SessionSchema.parse(await (await apiFetch('/api/session')).json());
}

export async function signOut(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

/** The app's sign-in page, where the header's sign-in pill goes. */
export const LOGIN_PATH = '/login';

/** The paths sign-in may come back to: this site only, as the server checks (apps/server oidc-login.ts). */
export function safeReturnPath(value: string | null | undefined): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  // The sign-in page itself would only show the card again.
  return value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`) ? '/' : value;
}

/** The sign-in page, remembering the page the visitor was on (home needs no reminder). */
export function loginPageHref(path: string): string {
  const back = safeReturnPath(path);
  return back === '/' ? LOGIN_PATH : `${LOGIN_PATH}?${new URLSearchParams({ return: back }).toString()}`;
}

/** Where the sign-in page sends the visitor back to (its `?return=`), home by default. */
export function loginReturnPath(search: string): string {
  return safeReturnPath(new URLSearchParams(search).get('return'));
}

/** The server's sign-in route: to the IdP in `locale`, then back to `returnTo`. */
export function signInHref(locale: string, returnTo: string): string {
  return `/auth/login?${new URLSearchParams({ return: safeReturnPath(returnTo), lang: locale }).toString()}`;
}

/** The session, once; an unreachable API counts as signed out with sign-in unavailable. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    fetchSession()
      .then((info) => live && setState({ status: 'ready', ...info }))
      .catch(() => live && setState({ status: 'ready', signedIn: false, signInAvailable: false }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}
