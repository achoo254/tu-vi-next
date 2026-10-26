import { createApp } from './app';
import { loadConfig } from './config';
import { DEV_PGLITE_DIR, openPglite, openPostgres } from './db/client';

const config = loadConfig();
const pgliteDir = config.pgliteDir === null ? undefined : (config.pgliteDir ?? DEV_PGLITE_DIR);
const database = config.databaseUrl ? await openPostgres(config.databaseUrl) : await openPglite(pgliteDir);
console.log(`database: ${config.databaseUrl ? 'Postgres (DATABASE_URL)' : pgliteDir ? `PGlite at ${pgliteDir}` : 'PGlite in memory'}`);
console.log(`sign-in: ${config.auth ? `on (${config.auth.clientId} at ${config.auth.issuer})` : 'off (AUTH_CLIENT_SECRET unset)'}`);

// Loopback only: nginx (production) and the web dev server proxy to it.
const server = createApp({ config, db: database.db }).listen(config.port, '127.0.0.1', () => {
  console.log(`tuvi server listening on 127.0.0.1:${config.port} (${config.nodeEnv})`);
});

let stopping = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (stopping) process.exit(1);
  stopping = true;
  console.log(`${signal}: closing`);
  server.close();
  try {
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('shutdown failed', error instanceof Error ? error.message : typeof error);
    process.exit(1);
  }
}
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => void shutdown(signal));
