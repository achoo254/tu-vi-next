import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { brandAssets } from './vite-brand.ts';

/** The API in dev (apps/server, `pnpm dev`); production puts nginx in front of both. */
const API = 'http://127.0.0.1:5290';

export default defineConfig({
  plugins: [react(), brandAssets()],
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
    sourcemap: true,
  },
});
