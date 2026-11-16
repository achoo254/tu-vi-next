// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { yearRoutePaths } from './src/year/year-routes.ts';
import { STATIC_PAGES, staticPageHtml } from './vite-static-pages.ts';

const file = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url).href);
const ORIGIN = 'https://tuvi.hoandat.com';
const TEMPLATE = [
  '<head>',
  `<link rel="canonical" href="${ORIGIN}/" />`,
  `<meta property="og:url" content="${ORIGIN}/" />`,
  '</head>',
].join('\n');

describe('static pages', () => {
  it('points the canonical link and og:url at the page itself', () => {
    const html = staticPageHtml(TEMPLATE, ORIGIN, '/privacy');
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/privacy" />`);
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/privacy" />`);
    expect(html).not.toContain(`href="${ORIGIN}/"`);
  });

  it('fails when the template has no canonical link instead of shipping the home canonical', () => {
    expect(() => staticPageHtml(`<meta property="og:url" content="${ORIGIN}/" />`, ORIGIN, '/terms')).toThrow(/canonical/);
  });

  it('covers every page of the sitemap besides the home page and the prerendered yearly pages', () => {
    const sitemap = readFileSync(file('./public/sitemap.xml'), 'utf8');
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1] ?? '').pathname);
    const yearly = new Set(yearRoutePaths());
    expect(paths.filter((p) => p !== '/' && !yearly.has(p)).sort()).toEqual([...STATIC_PAGES].sort());
  });

  it('lets nginx serve <path>/index.html before the SPA fallback', () => {
    expect(readFileSync(file('../../infra/nginx/tuvi.hoandat.com.conf'), 'utf8')).toContain('try_files $uri $uri/index.html /index.html;');
  });
});
