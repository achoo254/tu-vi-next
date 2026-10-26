import { useEffect, useState } from 'react';
import * as z from 'zod/mini';
import { apiFetch } from './api-client';

const SessionSchema = z.object({ signedIn: z.boolean(), signInAvailable: z.boolean() });
export type SessionInfo = z.infer<typeof SessionSchema>;

export type SessionState = { status: 'loading' } | ({ status: 'ready' } & SessionInfo);

export async function fetchSession(): Promise<SessionInfo> {
  return SessionSchema.parse(await (await apiFetch('/api/session')).json());
}

export async function signOut(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

/** Where the sign-in button goes: back to this page after the IdP. */
export function signInHref(locale: string, location: Pick<Location, 'pathname' | 'search'> = window.location): string {
  const back = new URLSearchParams(location.search);
  back.delete('login');
  const returnTo = `${location.pathname}${back.size > 0 ? `?${back.toString()}` : ''}`;
  return `/auth/login?${new URLSearchParams({ return: returnTo, lang: locale }).toString()}`;
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
