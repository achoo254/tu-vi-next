import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { queStreaks } from '../db/schema';

/** Vietnam is UTC+7 all year (no daylight saving). */
const VIETNAM_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** The calendar day in Vietnam at `now`, as `YYYY-MM-DD`. */
export function vietnamDay(now: Date): string {
  return new Date(now.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

/** The day before a `YYYY-MM-DD` day. */
export function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

export interface QueState {
  /** Today in Vietnam, `YYYY-MM-DD`: the day the quẻ is drawn for. */
  day: string;
  /** Days in a row the account has drawn its quẻ, up to today or yesterday; 0 once a day was missed. */
  streak: number;
  /** Whether today's quẻ was already drawn. */
  drawnToday: boolean;
}

/** The account's streak as of `now`, without recording anything. */
export async function readQueState(db: Db, userId: string, now: Date): Promise<QueState> {
  const day = vietnamDay(now);
  const [row] = await db.select().from(queStreaks).where(eq(queStreaks.userId, userId));
  if (!row) return { day, streak: 0, drawnToday: false };
  const drawnToday = row.lastDay === day;
  const alive = drawnToday || row.lastDay === previousDay(day);
  return { day, streak: alive ? row.streak : 0, drawnToday };
}

/**
 * Records today's draw: the streak grows by one when the last draw was yesterday, stays when it was today already,
 * and starts again at 1 otherwise. One atomic upsert, so two tabs drawing at once count once.
 */
export async function recordQueDraw(db: Db, userId: string, now: Date): Promise<QueState> {
  const day = vietnamDay(now);
  const yesterday = previousDay(day);
  const [row] = await db
    .insert(queStreaks)
    .values({ userId, lastDay: day, streak: 1 })
    .onConflictDoUpdate({
      target: queStreaks.userId,
      set: {
        streak: sql`case when ${queStreaks.lastDay} = ${day}::date then ${queStreaks.streak} when ${queStreaks.lastDay} = ${yesterday}::date then ${queStreaks.streak} + 1 else 1 end`,
        lastDay: day,
      },
    })
    .returning({ streak: queStreaks.streak });
  if (!row) throw new Error('que streak upsert returned no row');
  return { day, streak: row.streak, drawnToday: true };
}
