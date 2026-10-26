/*
 * Last step of `pnpm build` (vite-year-pages.ts explains the approach): renders every yearly page with the
 * server build of src/year/year-prerender.tsx and writes it as dist/<path>/index.html next to the SPA. Fails
 * the build when a page is missing or lacks its title, so a broken page never ships as the bare SPA shell.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { asPrerenderModule, renderPageHtml, siteOrigin } from './vite-year-pages.ts';

const DIST = new URL('./dist/', import.meta.url);
const SSR_DIR = new URL('./dist-ssr/', import.meta.url);

async function main(): Promise<void> {
  const entry = asPrerenderModule(await import(pathToFileURL(fileURLToPath(new URL('year-prerender.js', SSR_DIR))).href));
  const template = readFileSync(new URL('index.html', DIST), 'utf8');
  const origin = siteOrigin();
  const paths = entry.yearRoutePaths();
  for (const path of paths) {
    const page = entry.renderYearPage(path);
    if (page === null) throw new Error(`prerender: no page for ${path}`);
    const html = renderPageHtml(template, page, origin);
    if (!html.includes(`<title>`) || !page.html.includes('<h1')) throw new Error(`prerender: ${path} has no title or heading`);
    const file = new URL(`.${path}/index.html`, DIST);
    mkdirSync(dirname(fileURLToPath(file)), { recursive: true });
    writeFileSync(file, html);
  }
  rmSync(SSR_DIR, { recursive: true, force: true });
  console.log(`prerendered ${paths.length} yearly pages into dist/`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
