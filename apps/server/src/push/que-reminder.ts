/**
 * The morning "Quẻ hôm nay" reminder: from 07:30 Vietnam time, one Web Push to every browser of an account that turned
 * it on, has a saved chart and has not drawn today's quẻ yet. Each account is claimed in `que_reminders` before its
 * sends, so a second run the same day (a restart, an overlapping tick) sends nothing again: at most once a day.
 * Runs inside the server on a timer; a server down at 07:30 catches up when it starts again that day.
 */
import { and, eq, exists, gte, lt, notExists, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { charts, pushSubscriptions, queReminders, queStreaks } from '../db/schema';
import { safeErrorText } from '../log-error';
import { vietnamDay } from '../que/que-store';
import type { ReminderLocale } from './push-store';
import { PushError, type PushSender } from './web-push-sender';

/** The reminder's time of day in Vietnam (UTC+7, no daylight saving). */
export const REMINDER_TIME = '07:30';

/** How often the server checks whether the day's reminders are due. */
export const REMINDER_CHECK_MS = 5 * 60 * 1000;

/** The words of the reminder. No chart name or birth data: it shows on a lock screen. */
const WORDS: Record<ReminderLocale, { title: string; body: string }> = {
  vi: { title: 'Quẻ hôm nay', body: 'Quẻ hôm nay của bạn đã sẵn sàng. Mở xem lời nhắn cho ngày mới nhé!' },
  en: { title: 'Quẻ of the day', body: 'Your quẻ for today is ready. Open it for a small nudge for the day.' },
};

/** Opens the app on the quẻ card. */
export const REMINDER_URL = '/#que-today';

/** The payload the service worker (apps/web/public/sw.js) shows. */
export function reminderPayload(locale: ReminderLocale): string {
  return JSON.stringify({ ...WORDS[locale], url: REMINDER_URL, tag: 'que-today' });
}

/** When the reminders of a `YYYY-MM-DD` Vietnam day are due. */
export function reminderStart(day: string): Date {
  return new Date(`${day}T${REMINDER_TIME}:00+07:00`);
}

export interface ReminderRun {
  /** The Vietnam day the run was for. */
  day: string;
  /** False before 07:30: nothing was looked at. */
  due: boolean;
  /** Accounts claimed (and so reminded) by this run. */
  accounts: number;
  sent: number;
  /** Subscriptions the push service reported gone, now deleted. */
  gone: number;
  failed: number;
}

/**
 * Sends the day's reminders that are due and not sent yet. A browser that turned the reminder on after today's
 * 07:30 waits for tomorrow, so turning it on never pings at once.
 */
export async function sendDueReminders(db: Db, sender: PushSender, now: Date): Promise<ReminderRun> {
  const day = vietnamDay(now);
  const start = reminderStart(day);
  const run: ReminderRun = { day, due: now >= start, accounts: 0, sent: 0, gone: 0, failed: 0 };
  if (!run.due) return run;

  const one = sql<number>`1`;
  const subscribedBeforeStart = lt(pushSubscriptions.createdAt, start);
  const candidates = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(
      and(
        subscribedBeforeStart,
        exists(db.select({ one }).from(charts).where(eq(charts.userId, pushSubscriptions.userId))),
        notExists(db.select({ one }).from(queStreaks).where(and(eq(queStreaks.userId, pushSubscriptions.userId), eq(queStreaks.lastDay, day)))),
        notExists(db.select({ one }).from(queReminders).where(and(eq(queReminders.userId, pushSubscriptions.userId), gte(queReminders.lastDay, day)))),
      ),
    );

  for (const { userId } of candidates) {
    // The claim: only the run whose upsert moves last_day to today sends, so two runs never both send.
    const [claimed] = await db
      .insert(queReminders)
      .values({ userId, lastDay: day })
      .onConflictDoUpdate({ target: queReminders.userId, set: { lastDay: day }, setWhere: lt(queReminders.lastDay, day) })
      .returning({ userId: queReminders.userId });
    if (!claimed) continue;
    run.accounts += 1;
    const targets = await db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), subscribedBeforeStart));
    for (const target of targets) {
      try {
        if ((await sender.send(target, reminderPayload(target.locale))) === 'gone') {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, target.id));
          run.gone += 1;
        } else {
          run.sent += 1;
        }
      } catch (error) {
        run.failed += 1;
        // The code only (push-<status>): never the endpoint or the keys.
        console.warn('que reminder push failed', error instanceof PushError ? error.code : safeErrorText(error));
      }
    }
  }
  return run;
}

export interface ReminderTimerOptions {
  db: Db;
  sender: PushSender;
  now?: () => Date;
  intervalMs?: number;
}

/** Checks at start and every few minutes; one run at a time. Returns the function that stops it. */
export function startReminderTimer({ db, sender, now = () => new Date(), intervalMs = REMINDER_CHECK_MS }: ReminderTimerOptions): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const run = await sendDueReminders(db, sender, now());
      if (run.accounts > 0) {
        console.log(`que reminders ${run.day}: ${run.accounts} account(s), sent ${run.sent}, gone ${run.gone}, failed ${run.failed}`);
      }
    } catch (error) {
      console.error('que reminders failed', safeErrorText(error));
    } finally {
      running = false;
    }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
