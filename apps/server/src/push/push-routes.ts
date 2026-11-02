/**
 * The daily quẻ reminder by Web Push: GET /api/push/key (the VAPID public key, null while push is off), and
 * POST/DELETE /api/push/subscriptions to turn it on or off for this browser (signed in; the app's Origin only).
 */
import express, { type Router } from 'express';
import { z } from 'zod';
import { requireUserId } from '../auth/require-user';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { HttpError } from '../http-error';
import { removePushSubscription, savePushSubscription } from './push-store';
import { isPushEndpoint } from './web-push-sender';

export interface PushRoutesOptions {
  config: ServerConfig;
  db: Db;
  now: () => Date;
}

const Endpoint = z.string().max(1000).refine(isPushEndpoint);

/** What PushSubscription.toJSON() gives in a browser, plus the language of the reminder. */
const SubscribeBody = z.object({
  subscription: z.object({
    endpoint: Endpoint,
    keys: z.object({
      p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}={0,2}$/),
      auth: z.string().regex(/^[A-Za-z0-9_-]{16,32}={0,2}$/),
    }),
  }),
  locale: z.enum(['vi', 'en']),
});

const UnsubscribeBody = z.object({ endpoint: z.string().max(1000) });

export function pushRoutes({ config, db, now }: PushRoutesOptions): Router {
  const router = express.Router();
  router.use('/api/push', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/api/push/key', (_req, res) => {
    res.json({ publicKey: config.push?.publicKey ?? null });
  });

  router.post('/api/push/subscriptions', async (req, res) => {
    const at = now();
    const userId = await requireUserId(req, config, db, at);
    if (!config.push) throw new HttpError(404, 'push-off');
    const parsed = SubscribeBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'bad-subscription');
    const { subscription, locale } = parsed.data;
    const result = await savePushSubscription(db, userId, { endpoint: subscription.endpoint, ...subscription.keys, locale }, at);
    if (result !== 'saved') throw new HttpError(409, result);
    res.status(204).end();
  });

  // Works with push off too, so a browser can always be taken off the list.
  router.delete('/api/push/subscriptions', async (req, res) => {
    const userId = await requireUserId(req, config, db, now());
    const parsed = UnsubscribeBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'bad-request');
    await removePushSubscription(db, userId, parsed.data.endpoint);
    res.status(204).end();
  });

  return router;
}
