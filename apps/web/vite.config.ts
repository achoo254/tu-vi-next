import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { brandAssets } from './vite-brand.ts';
import { themeBootstrap } from './vite-theme-bootstrap.ts';
import { yearPages } from './vite-year-pages.ts';

/** The API in dev (apps/server, `pnpm dev`); production puts nginx in front of both. */
const API = 'http://127.0.0.1:5290';

export default defineConfig({
  plugins: [react(), brandAssets(), themeBootstrap(), yearPages()],
  server: {
    port: 5291,
    strictPort: true,
    proxy: { '/api': API, '/auth': API, '/healthz': API },
  },
  preview: {
    port: 5291,
    strictPort: true,
    proxy: { '/api': API, '/auth': API, '/healthz': API },
  },
  build: {
    target: 'es2022',
    // Art and fonts stay as files: inlined art would grow the main chunk, and the CSP (font-src 'self') refuses
    // data: fonts, so an inlined font subset would silently fall back to a system font.
    assetsInlineLimit: (file) => (file.includes('/src/art/') || /\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
    sourcemap: true,
  },
});
