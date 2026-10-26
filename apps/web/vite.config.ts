import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { brandAssets } from './vite-brand.ts';
import { yearPages } from './vite-year-pages.ts';

/** The API in dev (apps/server, `pnpm dev`); production puts nginx in front of both. */
const API = 'http://127.0.0.1:5290';

export default defineConfig({
  plugins: [react(), brandAssets(), yearPages()],
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
    // The small art (zodiac marks, star icons) stays as files: inlined as base64 it would grow the main chunk.
    assetsInlineLimit: (file) => (file.includes('/src/art/') ? false : undefined),
    sourcemap: true,
  },
});
