/**
 * Server-side entry of the yearly pages, built with `vite build --ssr` and run once at build time
 * (apps/web/prerender.ts) and on each request in dev (vite-year-pages.ts): the HTML crawlers and link
 * previews read. The browser renders the same components (year-page.tsx) over it.
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { I18nProvider } from '../i18n/i18n';
import { PageShell } from '../layout/page-shell';
import { type PageHead, YearPage, yearPageHead } from './year-page';
import { parseYearRoute } from './year-routes';

export { yearRoutePaths } from './year-routes';
export type { PageHead };

export interface RenderedPage {
  head: PageHead;
  /** The markup that goes inside #root. */
  html: string;
}

/** The yearly page at a normalised `path`, or null when there is none. */
export function renderYearPage(path: string): RenderedPage | null {
  const route = parseYearRoute(path);
  if (route === null) return null;
  const html = renderToString(
    <StrictMode>
      <I18nProvider>
        <PageShell path={path} session={{ status: 'loading' }}>
          <YearPage route={route} />
        </PageShell>
      </I18nProvider>
    </StrictMode>,
  );
  return { head: yearPageHead(route), html };
}
