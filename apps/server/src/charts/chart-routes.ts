/** Saved charts of the signed-in account: GET/POST /api/charts, DELETE /api/charts/:id. */
import { BirthInputSchema, birthDateExists } from '@tuvi/chart/input';
import express, { type Request, type Router } from 'express';
import { z } from 'zod';
import { readSessionToken } from '../auth/session-cookie';
import { findSession } from '../auth/session-store';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { HttpError } from '../http-error';
import { deleteChart, listCharts, saveChart } from './chart-store';

export interface ChartRoutesOptions {
  config: ServerConfig;
  db: Db;
  now: () => Date;
}

const ChartId = z.uuid();

export function chartRoutes({ config, db, now }: ChartRoutesOptions): Router {
  const router = express.Router();

  async function userIdOf(req: Request): Promise<string> {
    const token = readSessionToken(req, config);
    const session = token ? await findSession(db, token, now()) : null;
    if (!session) throw new HttpError(401, 'sign-in-required');
    return session.userId;
  }

  router.get('/api/charts', async (req, res) => {
    const userId = await userIdOf(req);
    res.set('Cache-Control', 'no-store').json({ charts: await listCharts(db, userId) });
  });

  router.post('/api/charts', async (req, res) => {
    const userId = await userIdOf(req);
    const parsed = BirthInputSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'invalid-chart');
    if (!birthDateExists(parsed.data)) throw new HttpError(400, 'invalid-date');
    const saved = await saveChart(db, userId, parsed.data, now());
    if (saved === 'limit') throw new HttpError(409, 'chart-limit');
    res.status(201).json({ chart: saved });
  });

  router.delete('/api/charts/:id', async (req, res) => {
    const userId = await userIdOf(req);
    const id = ChartId.safeParse(req.params.id);
    if (!id.success || !(await deleteChart(db, userId, id.data))) throw new HttpError(404, 'not-found');
    res.status(204).end();
  });

  return router;
}
