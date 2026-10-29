import { AccountMenu } from '@achoo254/app-shell';
import { writePreference } from '@achoo254/app-shell/preferences';
import { type ReactNode, useState } from 'react';
import { LOGIN_PATH, type SessionState, type SessionUser, loginPageHref, signOut } from '../api/session-api';
import { BRAND_MARK_SRC, ECOSYSTEM_URL, IDP_ACCOUNT_URL, brand } from '../brand';
import { LOCALES, type Locale, useI18n } from '../i18n/i18n';
import { FEATURED_YEAR, parseYearRoute, yearIndexPath } from '../year/year-routes';

/** Each language in its own words (never translated), and the short code the header pill shows. */
const LOCALE_NAMES: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English' };
const LOCALE_CODES: Record<Locale, string> = { vi: 'VI', en: 'EN' };

interface NavLink {
  href: string;
  label: string;
  dataId: string;
  current: boolean;
}

/**
 * The header's language pill. A pick is stored in the cookie every hoandat.com app reads (`hd_lang`), so the
 * other apps open in it too, then the page re-renders in it.
 */
function LanguageSwitch(): ReactNode {
  const { t, locale, setLocale } = useI18n();
  return (
    <fieldset className="lang-switch" data-id="lang-switch">
      <legend className="sr-only">{t('layout.language')}</legend>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          className="lang-option"
          lang={option}
          title={LOCALE_NAMES[option]}
          aria-pressed={option === locale}
          data-id={`lang-${option}`}
          onClick={() => {
            writePreference('lang', option, { domain: brand.primaryTenant.domain });
            setLocale(option);
          }}
        >
          <span aria-hidden="true">{LOCALE_CODES[option]}</span>
          <span className="sr-only">{LOCALE_NAMES[option]}</span>
        </button>
      ))}
    </fieldset>
  );
}

/**
 * The signed-in account in place of the header's sign-in pill: the shared account menu (avatar and name, the
 * hoandat.com account pages, sign-out), dressed in the night-sky look by app.css.
 */
function AccountButton({ user }: { user: SessionUser | undefined }): ReactNode {
  const { locale } = useI18n();
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
    <AccountMenu
      user={user ?? {}}
      locale={locale}
      domain={brand.primaryTenant.domain}
      idpAccountUrl={IDP_ACCOUNT_URL}
      signOut={{ onClick: () => void onSignOut(), busy: signingOut }}
    />
  );
}

/** The sign-in pill, the account menu, or nothing while the session loads or when sign-in is not set up. */
function AccountControl({ path, session }: { path: string; session: SessionState }): ReactNode {
  const { t } = useI18n();
  if (session.status === 'ready' && session.signedIn) return <AccountButton user={session.user} />;
  // Sign-in is not configured on this server: no pill that would only come back with "not open yet".
  if (session.status === 'ready' && !session.signInAvailable) return null;
  return (
    <a className="pill pill-gold" href={loginPageHref(path)} data-id="public-sign-in" aria-current={path === LOGIN_PATH ? 'page' : undefined}>
      {t('layout.signIn')}
    </a>
  );
}

function SiteHeader({ path, session, navLinks }: { path: string; session: SessionState; navLinks: NavLink[] }): ReactNode {
  const { t } = useI18n();
  return (
    <header className="topbar" data-id="public-header">
      <div className="topbar-inner container">
        <a className="brand" href="/" data-id="public-home">
          <img className="brand-mark" src={BRAND_MARK_SRC} width={36} height={36} alt="" aria-hidden="true" />
          <span className="brand-name">{brand.appName}</span>
        </a>
        <div className="topbar-end">
          <nav className="topbar-nav hide-phone" aria-label={t('layout.nav')}>
            {navLinks.map((link) => (
              <a key={link.dataId} className="pill" href={link.href} data-id={link.dataId} aria-current={link.current ? 'page' : undefined}>
                {link.label}
              </a>
            ))}
          </nav>
          <LanguageSwitch />
          <AccountControl path={path} session={session} />
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ path, navLinks }: { path: string; navLinks: NavLink[] }): ReactNode {
  const { t } = useI18n();
  const domain = brand.primaryTenant.domain;
  const links: NavLink[] = [
    { href: '/privacy', label: t('layout.privacy'), dataId: 'foot-privacy', current: path === '/privacy' },
    { href: '/terms', label: t('layout.terms'), dataId: 'foot-terms', current: path === '/terms' },
    { href: '/credits', label: t('layout.credits'), dataId: 'foot-credits', current: path === '/credits' },
  ];
  return (
    <footer className="foot" data-id="public-footer">
      <div className="foot-inner container">
        <div className="foot-brand">
          <img className="foot-mark" src={BRAND_MARK_SRC} width={28} height={28} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <a className="foot-home" href={ECOSYSTEM_URL} data-id="foot-home">
            {t('layout.ecosystem', { domain })}
          </a>
        </div>
        <nav className="foot-links" aria-label={t('layout.footLinks')}>
          {/* The header hides its links on phones, where the app name needs the room; they show here instead. */}
          {navLinks.map((link) => (
            <a key={link.dataId} className="foot-link only-phone" href={link.href} data-id={`foot-${link.dataId}`} aria-current={link.current ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
          {links.map((link) => (
            <a key={link.dataId} className="foot-link" href={link.href} data-id={link.dataId} aria-current={link.current ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
        <p className="foot-note" data-id="foot-note">
          {t('layout.disclaimer')}
        </p>
      </div>
    </footer>
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
 * Every page, signed out or in: the app's own night-sky backdrop, header and footer around the page. Also
 * rendered at build time for the yearly pages (year-prerender.tsx), as a visitor whose session is still loading.
 */
export function TuviPage({ path, session, layout = 'flow', children }: TuviPageProps): ReactNode {
  const { t } = useI18n();
  const navLinks: NavLink[] = [{ href: yearIndexPath(), label: t('layout.yearPages', { year: FEATURED_YEAR }), dataId: 'nav-year', current: parseYearRoute(path) !== null }];

  return (
    <div className="site">
      {/* The night sky: nebula glows, two layers of stars and faint constellations; decorative. */}
      <div className="sky" aria-hidden="true">
        <div className="sky-stars sky-stars-far" />
        <div className="sky-stars sky-stars-near" />
        <div className="sky-constellations" />
      </div>
      <a className="skip-link" href="#main" data-id="skip-link">
        {t('layout.skip')}
      </a>
      <SiteHeader path={path} session={session} navLinks={navLinks} />
      {/* Focusable by the skip link only, not in the tab order. */}
      <main id="main" tabIndex={-1} className={layout === 'center' ? 'main container main-center' : 'main container'}>
        {layout === 'center' ? children : <div className="page">{children}</div>}
      </main>
      <SiteFooter path={path} navLinks={navLinks} />
    </div>
  );
}
