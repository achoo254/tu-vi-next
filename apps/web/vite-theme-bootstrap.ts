/*
 * Puts the shared theme script of @achoo254/app-shell inline in the <head> of index.html, before the stylesheet,
 * so `data-theme` is set before the first paint and a dark page never flashes light. The prerendered yearly pages
 * are written from the built index.html, so they carry it too. The CSP of infra/nginx/tuvi.hoandat.com.conf
 * allows exactly this text by its hash (vite-theme-bootstrap.test.ts keeps the two in step). Built here, not in
 * the app: the page needs only the script's text, not the code making it.
 */
import { themeBootstrapScript } from '@achoo254/app-shell/preferences';
import type { Plugin } from 'vite';

/** Placeholder in index.html for the inline theme script. */
export const THEME_BOOTSTRAP_MARKER = '<!--theme-bootstrap-->';

/** The inline script. Tử Vi had no theme choice of its own before the shared one, so there is no older key. */
export const THEME_BOOTSTRAP_SCRIPT = themeBootstrapScript();

export function themeBootstrap(): Plugin {
  return {
    name: 'tuvi-theme-bootstrap',
    transformIndexHtml(html) {
      if (!html.includes(THEME_BOOTSTRAP_MARKER)) throw new Error(`index.html lost ${THEME_BOOTSTRAP_MARKER}`);
      return html.replace(THEME_BOOTSTRAP_MARKER, () => `<script>${THEME_BOOTSTRAP_SCRIPT}</script>`);
    },
  };
}
