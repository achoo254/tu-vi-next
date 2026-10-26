import { type ReactNode, useEffect, useMemo } from 'react';
import { useSession } from './api/session-api';
import { NOT_FOUND_URL } from './art/illustrations';
import { brand } from './brand';
import { useI18n } from './i18n/i18n';
import { PageShell } from './layout/page-shell';
import { HomePage } from './pages/home-page';
import type * as LegalPagesModule from './pages/legal-pages';
import type { LegalPageKind } from './pages/legal-pages';
import type * as YearPagesModule from './year/year-page';
import { parseYearRoute } from './year/year-routes';

export type YearPages = typeof YearPagesModule;
export type LegalPages = typeof LegalPagesModule;

/**
 * Page code outside the main bundle, loaded before the first render on its paths (main.tsx): the legal pages
 * (mostly text) and the yearly pages. Null when the path does not need it or it failed to load.
 */
export interface PageModules {
  legalPages: LegalPages | null;
  yearPages: YearPages | null;
}

const NO_MODULES: PageModules = { legalPages: null, yearPages: null };

const LEGAL_PATHS: Record<string, LegalPageKind> = { '/privacy': 'privacy', '/terms': 'terms', '/credits': 'credits' };

/** Normalised path: no trailing slash except the root. */
export function routePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/** The page modules the page at `pathname` needs. Rejects when one fails to load. */
export async function loadPageModules(pathname: string): Promise<PageModules> {
  const path = routePath(pathname);
  const [legalPages, yearPages] = await Promise.all([
    LEGAL_PATHS[path] ? import('./pages/legal-pages') : null,
    parseYearRoute(path) ? import('./year/year-page') : null,
  ]);
  return { legalPages, yearPages };
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

/** A page whose code could not be loaded (and no prerendered copy was on the page). */
function PageLoadFailed(): ReactNode {
  const { t } = useI18n();
  return (
    <p className="alert alert-error" role="alert" data-id="page-load-failed">
      {t('page.loadFailed')}{' '}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
        {t('chart.reload')}
      </button>
    </p>
  );
}

/** The page for the current path inside the shell. */
export function App({ pathname, modules = NO_MODULES }: { pathname: string; modules?: PageModules }): ReactNode {
  const { t, locale } = useI18n();
  const session = useSession();
  const path = routePath(pathname);
  const legal = LEGAL_PATHS[path];
  const yearRoute = useMemo(() => parseYearRoute(path), [path]);
  const { legalPages, yearPages } = modules;

  useEffect(() => {
    if (yearRoute && yearPages) {
      document.title = yearPages.yearPageTitle(yearRoute, locale);
      return;
    }
    let page: string;
    if (path === '/') page = t('intro.title');
    else if (legal && legalPages) page = legalPages.legalTitle(legal, locale);
    else if (legal || yearRoute) page = t('page.loadFailed');
    else page = t('notFound.title');
    document.title = `${page} · ${brand.appName}`;
  }, [path, legal, legalPages, yearRoute, yearPages, locale, t]);

  let page: ReactNode;
  if (path === '/') page = <HomePage session={session} />;
  else if (legal) page = legalPages ? <legalPages.LegalPage kind={legal} /> : <PageLoadFailed />;
  else if (yearRoute) page = yearPages ? <yearPages.YearPage route={yearRoute} /> : <PageLoadFailed />;
  else page = <NotFound />;

  return (
    <PageShell path={path} session={session}>
      {page}
    </PageShell>
  );
}
