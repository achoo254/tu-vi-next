import { PublicPage, type ShellBrand, type ShellLink } from '@achoo254/app-shell';
import { type ReactNode, useState } from 'react';
import { LOGIN_PATH, type SessionState, loginPageHref, signOut } from '../api/session-api';
import { brand } from '../brand';
import { LOCALES, useI18n } from '../i18n/i18n';
import { FEATURED_YEAR, parseYearRoute, yearIndexPath } from '../year/year-routes';

/** The app as the shared shell names it; the AI-drawn mark is apps/web/public/brand-mark-96.webp (pnpm brand:gen). */
export const SHELL_BRAND: ShellBrand = { appName: brand.appName, domain: brand.primaryTenant.domain, markSrc: '/brand-mark-96.webp' };

/** The sign-out control in place of the header's sign-in pill, styled as the header's links. */
function SignOutButton(): ReactNode {
  const { t } = useI18n();
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
    <button type="button" className="shell-topbar-link" onClick={() => void onSignOut()} disabled={signingOut} data-id="nav-sign-out">
      {t('layout.signOut')}
    </button>
  );
}

interface TuviPageProps {
  /** Normalised path of the page (app.tsx routePath). */
  path: string;
  session: SessionState;
  /** "center" for the sign-in page's lone card. */
  layout?: 'flow' | 'center';
  children: ReactNode;
}

/**
 * Every page, signed out or in: the header, frame and footer of every hoandat.com app (@achoo254/app-shell)
 * around the page. Also rendered at build time for the yearly pages (year-prerender.tsx), as a visitor whose
 * session is still loading.
 */
export function TuviPage({ path, session, layout = 'flow', children }: TuviPageProps): ReactNode {
  const { t, locale, setLocale } = useI18n();
  const navLinks: ShellLink[] = [
    { href: yearIndexPath(), label: t('layout.yearPages', { year: FEATURED_YEAR }), dataId: 'nav-year', current: parseYearRoute(path) !== null },
  ];
  const footerLinks: ShellLink[] = [{ href: '/credits', label: t('layout.credits'), dataId: 'foot-credits', current: path === '/credits' }];
  let accountSlot: ReactNode;
  if (session.status === 'ready' && session.signedIn) accountSlot = <SignOutButton />;
  // Sign-in is not configured on this server: no pill that would only come back with "not open yet".
  else if (session.status === 'ready' && !session.signInAvailable) accountSlot = null;

  return (
    <PublicPage
      brand={SHELL_BRAND}
      locale={locale}
      locales={LOCALES}
      onLocaleChange={setLocale}
      signInHref={loginPageHref(path)}
      signInCurrent={path === LOGIN_PATH}
      navLinks={navLinks}
      accountSlot={accountSlot}
      footerLinks={footerLinks}
      footerNote={t('layout.disclaimer')}
      layout={layout}
    >
      {layout === 'center' ? children : <div className="page">{children}</div>}
    </PublicPage>
  );
}
