import type { ReactNode } from 'react';
import type { SessionState } from '../api/session-api';
import { PageFooter } from './page-footer';
import { TopBar } from './top-bar';

/** The page shell (top bar, body, footer, as on auth-next). Also rendered at build time for the yearly pages. */
export function PageShell({ path, session, children }: { path: string; session: SessionState; children: ReactNode }): ReactNode {
  return (
    <>
      <TopBar path={path} session={session} />
      <main className="page container">{children}</main>
      <PageFooter />
    </>
  );
}
