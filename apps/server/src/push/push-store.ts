import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { charts, pushSubscriptions } from '../db/schema';

/** Browsers one account may turn the reminder on in. */
export const MAX_PUSH_DEVICES = 10;

export type ReminderLocale = 'vi' | 'en';

export interface NewPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: ReminderLocale;
}

/**
 * Turns the reminder on for one browser. The reminder is about the quẻ of a saved chart, so an account without one
 * cannot turn it on. One endpoint is one browser: whoever turned it on there last gets it (the row moves accounts).
 */
export async function savePushSubscription(
  db: Db,
  userId: string,
  subscription: NewPushSubscription,
  now: Date,
): Promise<'saved' | 'no-chart' | 'too-many-devices'> {
  const [chart] = await db.select({ one: sql<number>`1` }).from(charts).where(eq(charts.userId, userId)).limit(1);
  if (!chart) return 'no-chart';
  const mine = await db.select({ endpoint: pushSubscriptions.endpoint }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  if (mine.length >= MAX_PUSH_DEVICES && !mine.some((row) => row.endpoint === subscription.endpoint)) return 'too-many-devices';
  const { endpoint, p256dh, auth, locale } = subscription;
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth, locale, createdAt: now })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth, locale } });
  return 'saved';
}

/** Turns the reminder off for one browser of the account (nothing happens for another account's endpoint). */
export async function removePushSubscription(db: Db, userId: string, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}
