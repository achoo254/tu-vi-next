/** The signed-in account's "Quẻ hôm nay" streak: GET /api/que (read), POST /api/que/draw (record today's draw). */
import express, { type Router } from 'express';
import { requireUserId } from '../auth/require-user';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { readQueState, recordQueDraw } from './que-store';

export interface QueRoutesOptions {
  config: ServerConfig;
  db: Db;
  now: () => Date;
}

export function queRoutes({ config, db, now }: QueRoutesOptions): Router {
  const router = express.Router();

  router.get('/api/que', async (req, res) => {
    const at = now();
    const userId = await requireUserId(req, config, db, at);
    res.set('Cache-Control', 'no-store').json(await readQueState(db, userId, at));
  });

  router.post('/api/que/draw', async (req, res) => {
    const at = now();
    const userId = await requireUserId(req, config, db, at);
    res.set('Cache-Control', 'no-store').json(await recordQueDraw(db, userId, at));
  });

  return router;
}
