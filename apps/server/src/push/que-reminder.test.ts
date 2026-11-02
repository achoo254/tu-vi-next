import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DbHandle, openPglite } from '../db/client';
import { charts, pushSubscriptions, users } from '../db/schema';
import { recordQueDraw } from '../que/que-store';
import { REMINDER_URL, reminderStart, sendDueReminders, startReminderTimer } from './que-reminder';
import { PushError, type PushResult, type PushSender, type PushTarget } from './web-push-sender';

const DAY = '2026-11-02';
/** 07:30 in Vietnam on DAY. */
const START = new Date('2026-11-02T00:30:00Z');
const BEFORE_START = new Date('2026-11-02T00:29:59Z');
const LATER_TODAY = new Date('2026-11-02T10:00:00Z');
const NEXT_MORNING = new Date('2026-11-03T00:31:00Z');
const SUBSCRIBED_AT = new Date('2026-11-01T12:00:00Z');

interface Sent {
  endpoint: string;
  payload: { title: string; body: string; url: string; tag: string };
}

/** Records every send; answers per endpoint (sent by default). */
function fakeSender(answers: Record<string, PushResult | 'fail'> = {}): PushSender & { sent: Sent[] } {
  const sent: Sent[] = [];
  return {
    sent,
    async send(target: PushTarget, payload: string) {
      const answer = answers[target.endpoint] ?? 'sent';
      if (answer === 'fail') throw new PushError('push-500');
      sent.push({ endpoint: target.endpoint, payload: JSON.parse(payload) as Sent['payload'] });
      return answer;
    },
  };
}

describe('the morning quẻ reminder', () => {
  let database: DbHandle;
  let n = 0;

  beforeEach(async () => {
    database = await openPglite();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await database.close();
  });

  /** An account with (by default) a saved chart and browsers that turned the reminder on the day before. */
  async function account({ chart = true, endpoints = 1, locale = 'vi', subscribedAt = SUBSCRIBED_AT } = {}): Promise<{ userId: string; endpoints: string[] }> {
    const { db } = database;
    n += 1;
    const [user] = await db.insert(users).values({ sub: `reminder-${n}`, createdAt: new Date() }).returning({ id: users.id });
    if (!user) throw new Error('no user');
    if (chart) {
      await db.insert(charts).values({
        userId: user.id,
        name: 'Lan',
        calendar: 'solar',
        year: 1995,
        month: 3,
        day: 8,
        isLeapMonth: false,
        hour: 9,
        minute: 0,
        gender: 'female',
        createdAt: new Date(),
      });
    }
    const list = Array.from({ length: endpoints }, (_, i) => `https://fcm.googleapis.com/fcm/send/u${n}-d${i}`);
    for (const endpoint of list) {
      await db.insert(pushSubscriptions).values({ userId: user.id, endpoint, p256dh: 'k', auth: 'a', locale: locale as 'vi' | 'en', createdAt: subscribedAt });
    }
    return { userId: user.id, endpoints: list };
  }

  it('is due from 07:30 Vietnam time', () => {
    expect(reminderStart(DAY).toISOString()).toBe(START.toISOString());
  });

  it('sends nothing before 07:30', async () => {
    await account();
    const sender = fakeSender();
    expect(await sendDueReminders(database.db, sender, BEFORE_START)).toMatchObject({ day: DAY, due: false, accounts: 0 });
    expect(sender.sent).toEqual([]);
  });

  it('reminds every browser of the account once a Vietnam day, opening the quẻ card', async () => {
    const vi_ = await account({ endpoints: 2 });
    const en = await account({ locale: 'en' });
    const sender = fakeSender();
    expect(await sendDueReminders(database.db, sender, START)).toEqual({ day: DAY, due: true, accounts: 2, sent: 3, gone: 0, failed: 0 });
    expect(sender.sent.map((s) => s.endpoint).sort()).toEqual([...vi_.endpoints, ...en.endpoints].sort());
    const viPayload = sender.sent.find((s) => s.endpoint === vi_.endpoints[0])?.payload;
    expect(viPayload).toEqual({ title: 'Quẻ hôm nay', body: expect.stringContaining('sẵn sàng'), url: REMINDER_URL, tag: 'que-today' });
    expect(REMINDER_URL).toBe('/#que-today');
    expect(sender.sent.find((s) => s.endpoint === en.endpoints[0])?.payload.title).toBe('Quẻ of the day');
    // Later the same day (another tick, a restart): nothing again.
    expect(await sendDueReminders(database.db, sender, LATER_TODAY)).toMatchObject({ accounts: 0, sent: 0 });
    expect(sender.sent).toHaveLength(3);
    // The next morning: again.
    expect(await sendDueReminders(database.db, sender, NEXT_MORNING)).toMatchObject({ day: '2026-11-03', accounts: 2, sent: 3 });
  });

  it('sends once even when two runs overlap', async () => {
    await account();
    const sender = fakeSender();
    const runs = await Promise.all([sendDueReminders(database.db, sender, START), sendDueReminders(database.db, sender, START)]);
    expect(runs.map((r) => r.sent).sort()).toEqual([0, 1]);
    expect(sender.sent).toHaveLength(1);
  });

  it('skips accounts without a saved chart and accounts that already drew today\'s quẻ', async () => {
    await account({ chart: false });
    const drawn = await account();
    await recordQueDraw(database.db, drawn.userId, new Date('2026-11-02T00:10:00Z'));
    const sender = fakeSender();
    expect(await sendDueReminders(database.db, sender, START)).toMatchObject({ accounts: 0, sent: 0 });
  });

  it('lets a browser turned on after today\'s 07:30 wait for tomorrow', async () => {
    const late = await account({ subscribedAt: new Date('2026-11-02T03:00:00Z') });
    const sender = fakeSender();
    expect(await sendDueReminders(database.db, sender, LATER_TODAY)).toMatchObject({ accounts: 0 });
    expect(await sendDueReminders(database.db, sender, NEXT_MORNING)).toMatchObject({ accounts: 1, sent: 1 });
    expect(sender.sent[0]?.endpoint).toBe(late.endpoints[0]);
  });

  it('deletes subscriptions the push service reports gone, keeps ones that failed, and never logs an endpoint', async () => {
    const { endpoints } = await account({ endpoints: 3 });
    const [gone, failing, fine] = endpoints;
    if (!gone || !failing || !fine) throw new Error('three endpoints expected');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sender = fakeSender({ [gone]: 'gone', [failing]: 'fail' });
    expect(await sendDueReminders(database.db, sender, START)).toMatchObject({ accounts: 1, sent: 1, gone: 1, failed: 1 });
    const left = await database.db.select({ endpoint: pushSubscriptions.endpoint }).from(pushSubscriptions);
    expect(left.map((row) => row.endpoint).sort()).toEqual([failing, fine].sort());
    expect(warn).toHaveBeenCalledWith('que reminder push failed', 'push-500');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('fcm.googleapis.com');
  });

  it('runs from a timer that checks at start and logs counts only', async () => {
    const { endpoints } = await account();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const sender = fakeSender();
    const stop = startReminderTimer({ db: database.db, sender, now: () => START, intervalMs: 60_000 });
    try {
      await vi.waitFor(() => expect(sender.sent).toHaveLength(1));
      await vi.waitFor(() => expect(log).toHaveBeenCalledWith(`que reminders ${DAY}: 1 account(s), sent 1, gone 0, failed 0`));
      expect(JSON.stringify(log.mock.calls)).not.toContain(endpoints[0]);
    } finally {
      stop();
    }
    // The account's rows are still in place for the next day.
    expect(await database.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoints[0] ?? ''))).toHaveLength(1);
  });
});
