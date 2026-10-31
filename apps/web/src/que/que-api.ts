import * as z from 'zod/mini';
import { apiFetch } from '../api/api-client';

const QueStateSchema = z.object({
  /** Today in Vietnam (UTC+7) as the server sees it, `YYYY-MM-DD`: the day the quẻ is for. */
  day: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/)),
  streak: z.int().check(z.gte(0)),
  drawnToday: z.boolean(),
});
export type QueState = z.infer<typeof QueStateSchema>;

/** The account's streak and whether today's quẻ was drawn (signed in only). */
export async function fetchQueState(): Promise<QueState> {
  return QueStateSchema.parse(await (await apiFetch('/api/que')).json());
}

/** Records today's draw; the streak grows once a day. */
export async function drawQue(): Promise<QueState> {
  return QueStateSchema.parse(await (await apiFetch('/api/que/draw', { method: 'POST' })).json());
}
