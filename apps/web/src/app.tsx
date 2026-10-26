import { type ReactNode, useEffect } from 'react';
import { useSession } from './api/session-api';
import { NOT_FOUND_URL } from './art/illustrations';
import { brand } from './brand';
import { useI18n } from './i18n/i18n';
import { PageFooter } from './layout/page-footer';
import { TopBar } from './layout/top-bar';
import { HomePage } from './pages/home-page';
import { type LegalPageKind, LegalPage, legalTitle } from './pages/legal-pages';

const LEGAL_PATHS: Record<string, LegalPageKind> = { '/privacy': 'privacy', '/terms': 'terms', '/credits': 'credits' };

/** Normalised path: no trailing slash except the root. */
export function routePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function NotFound(): ReactNode {
  const { t } = useI18n();
  return (
    <article className="card doc">
      <img className="not-found-art" src={NOT_FOUND_URL} width={120} height={120} alt="" aria-hidden="true" decoding="async" />
      <h1 className="doc-title">{t('notFound.title')}</h1>
      <a className="btn btn-primary" href="/">
        {t('notFound.back')}
      </a>
    </article>
  );
}

/** The page shell (top bar, body, footer, as on auth-next) and the page for the current path. */
export function App({ pathname }: { pathname: string }): ReactNode {
  const { t, locale } = useI18n();
  const session = useSession();
  const path = routePath(pathname);
  const legal = LEGAL_PATHS[path];

  useEffect(() => {
    const page = path === '/' ? t('intro.title') : legal ? legalTitle(legal, locale) : t('notFound.title');
    document.title = `${page} · ${brand.appName}`;
  }, [path, legal, locale, t]);

  return (
    <>
      <TopBar path={path} session={session} />
      <main className="page container">{path === '/' ? <HomePage session={session} /> : legal ? <LegalPage kind={legal} /> : <NotFound />}</main>
      <PageFooter />
    </>
  );
}
