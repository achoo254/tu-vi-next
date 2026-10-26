import { type ReactNode, useState } from 'react';
import { type SessionState, signInHref, signOut } from '../api/session-api';
import { brand } from '../brand';
import { useI18n } from '../i18n/i18n';

/** AI-drawn app mark (apps/web/public, made by pnpm brand:gen), decorative: the name follows it. */
const BRAND_MARK = '/brand-mark-96.webp';

interface TopBarProps {
  path: string;
  session: SessionState;
}

/** Same bar as every hoandat.com app (auth-next layout): mark + name, nav links, account action. */
export function TopBar({ path, session }: TopBarProps): ReactNode {
  const { t, locale } = useI18n();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut(): Promise<void> {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      window.location.assign('/');
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-inner container">
        <a className="app-brand" href="/" data-id="app-brand">
          <img className="app-brand-mark" src={BRAND_MARK} width={24} height={24} alt="" aria-hidden="true" />
          <b>{brand.appName}</b>
        </a>
        <nav className="topbar-nav" aria-label={t('layout.nav')}>
          <a className="topbar-link" href="/" aria-current={path === '/' ? 'page' : undefined} data-id="nav-home">
            {t('layout.home')}
          </a>
          {session.status === 'ready' && session.signedIn && (
            <button type="button" className="topbar-link topbar-button" onClick={() => void onSignOut()} disabled={signingOut} data-id="nav-sign-out">
              {t('layout.signOut')}
            </button>
          )}
          {session.status === 'ready' && !session.signedIn && session.signInAvailable && (
            <a className="btn btn-primary btn-sm" href={signInHref(locale)} data-id="nav-sign-in">
              {t('layout.signIn')}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
