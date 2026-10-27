/*
 * Real HTML for the yearly pages ("/tu-vi-2027" and its 12 con giáp), so crawlers and link previews that do not
 * run JavaScript read the title, description, link preview, JSON-LD and the page itself.
 *
 * The site is a static SPA behind nginx. Rather than a server renderer, the pages are rendered once at build
 * time: `vite build --ssr src/year/year-prerender.tsx` builds the same React components for Node (asset URLs
 * match the client build), and prerender.ts writes dist/tu-vi-2027/<page>/index.html from dist/index.html.
 * nginx serves `$uri/index.html` before falling back to the SPA. In dev, the plugin below renders the same
 * HTML on each request, so `pnpm dev` and the E2E run see what production serves.
 */
import { readFileSync } from 'node:fs';
import { primaryOrigin } from '@achoo254/brand/hosts';
import type { Plugin, ViteDevServer } from 'vite';
import { loadTuviBrand } from './vite-brand.ts';
import type { RenderedPage } from './src/year/year-prerender.tsx';
import { parseYearRoute } from './src/year/year-routes.ts';

export const PRERENDER_ENTRY = 'src/year/year-prerender.tsx';

export interface PrerenderModule {
  renderYearPage(path: string): RenderedPage | null;
  yearRoutePaths(): string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Checks the module loaded at run time (built bundle or dev SSR) has the entry's shape. */
export function asPrerenderModule(value: unknown): PrerenderModule {
  if (!isRecord(value) || typeof value.renderYearPage !== 'function' || typeof value.yearRoutePaths !== 'function') {
    throw new Error(`${PRERENDER_ENTRY} does not export renderYearPage and yearRoutePaths`);
  }
  const render = value.renderYearPage as (path: string) => unknown;
  const paths = value.yearRoutePaths as () => unknown;
  return {
    renderYearPage(path) {
      const page = render(path);
      if (page === null) return null;
      if (!isRenderedPage(page)) throw new Error(`renderYearPage(${path}) returned an unexpected value`);
      return page;
    },
    yearRoutePaths() {
      const list = paths();
      if (!Array.isArray(list) || !list.every((p): p is string => typeof p === 'string')) throw new Error('yearRoutePaths() is not a list of paths');
      return list;
    },
  };
}

function isRenderedPage(value: unknown): value is RenderedPage {
  if (!isRecord(value) || typeof value.html !== 'string' || !isRecord(value.head)) return false;
  const { title, description, path, image, article } = value.head;
  return typeof title === 'string' && typeof description === 'string' && typeof path === 'string' && isRecord(image) && typeof image.path === 'string' && isRecord(article);
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (value: string): string => value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);

/** Replaces the single match of `pattern`; the template is ours, so anything else is a bug worth failing on. */
function replaceOnce(html: string, pattern: RegExp, replacement: string): string {
  const matches = html.match(new RegExp(pattern.source, 'g')) ?? [];
  if (matches.length !== 1) throw new Error(`prerender: expected one ${pattern.source} in index.html, found ${matches.length}`);
  return html.replace(pattern, () => replacement);
}

const metaProperty = (property: string): RegExp => new RegExp(`<meta property="${property}" content="[^"]*" />`);
const metaName = (name: string): RegExp => new RegExp(`<meta name="${name}" content="[^"]*" />`);

/** index.html (dev-transformed or built) turned into the page: its head tags, JSON-LD and the rendered body. */
export function renderPageHtml(template: string, page: RenderedPage, origin: string): string {
  const { head } = page;
  const url = `${origin}${head.path}`;
  const image = `${origin}${head.image.path}`;
  const appName = loadTuviBrand().appName;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: head.article.headline,
    description: head.article.description,
    inLanguage: head.article.inLanguage,
    datePublished: head.article.datePublished,
    dateModified: head.article.datePublished,
    image,
    url,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: appName, url: origin },
    publisher: { '@type': 'Organization', name: appName, url: origin },
    ...(head.video && {
      video: {
        '@type': 'VideoObject',
        name: head.video.name,
        description: head.video.description,
        contentUrl: `${origin}${head.video.contentPath}`,
        thumbnailUrl: `${origin}${head.video.thumbnailPath}`,
        uploadDate: head.video.uploadDate,
        duration: `PT${head.video.seconds}S`,
        inLanguage: head.article.inLanguage,
      },
    }),
  };
  // "<" is escaped inside the JSON so the text can never close the script element.
  const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;
  let html = template;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(head.title)}</title>`);
  html = replaceOnce(html, metaName('description'), `<meta name="description" content="${escapeHtml(head.description)}" />`);
  html = replaceOnce(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeHtml(url)}" />`);
  html = replaceOnce(html, metaProperty('og:type'), '<meta property="og:type" content="article" />');
  html = replaceOnce(html, metaProperty('og:title'), `<meta property="og:title" content="${escapeHtml(head.title)}" />`);
  html = replaceOnce(html, metaProperty('og:description'), `<meta property="og:description" content="${escapeHtml(head.description)}" />`);
  html = replaceOnce(html, metaProperty('og:url'), `<meta property="og:url" content="${escapeHtml(url)}" />`);
  html = replaceOnce(html, metaProperty('og:image'), `<meta property="og:image" content="${escapeHtml(image)}" />`);
  html = replaceOnce(html, metaProperty('og:image:width'), `<meta property="og:image:width" content="${head.image.width}" />`);
  html = replaceOnce(html, metaProperty('og:image:height'), `<meta property="og:image:height" content="${head.image.height}" />`);
  // A small square picture reads better as a summary card than stretched into a large one.
  html = replaceOnce(html, metaName('twitter:card'), `<meta name="twitter:card" content="${head.image.width >= 600 ? 'summary_large_image' : 'summary'}" />`);
  html = replaceOnce(html, metaName('twitter:image'), `<meta name="twitter:image" content="${escapeHtml(image)}" />`);
  html = replaceOnce(html, /<\/head>/, `  ${jsonLdTag}\n  </head>`);
  html = replaceOnce(html, /<div id="root"><\/div>/, `<div id="root">${page.html}</div>`);
  return html;
}

export function siteOrigin(): string {
  return primaryOrigin(loadTuviBrand());
}

async function renderInDev(server: ViteDevServer, url: string, path: string): Promise<string | null> {
  const template = await server.transformIndexHtml(url, readFileSync(new URL('./index.html', import.meta.url), 'utf8'));
  const page = asPrerenderModule(await server.ssrLoadModule(`/${PRERENDER_ENTRY}`)).renderYearPage(path);
  return page === null ? null : renderPageHtml(template, page, siteOrigin());
}

/** Dev only: serves the yearly pages as prerendered HTML (the build writes the same files). */
export function yearPages(): Plugin {
  return {
    name: 'tuvi-year-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        const raw = url.split('?')[0] ?? '/';
        const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw;
        if ((req.method !== 'GET' && req.method !== 'HEAD') || parseYearRoute(path) === null) {
          next();
          return;
        }
        renderInDev(server, url, path).then(
          (html) => {
            if (html === null) {
              next();
              return;
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(html);
          },
          (error: unknown) => next(error),
        );
      });
    },
  };
}
