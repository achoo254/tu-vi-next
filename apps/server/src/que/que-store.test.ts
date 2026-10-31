import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DbHandle, openPglite } from '../db/client';
import { users } from '../db/schema';
import { previousDay, readQueState, recordQueDraw, vietnamDay } from './que-store';

describe('vietnamDay / previousDay', () => {
  it('turns the day at midnight in Vietnam (UTC+7), not UTC', () => {
    expect(vietnamDay(new Date('2026-10-31T16:59:59Z'))).toBe('2026-10-31');
    expect(vietnamDay(new Date('2026-10-31T17:00:00Z'))).toBe('2026-11-01');
  });

  it('steps back over month, year and leap-day ends', () => {
    expect(previousDay('2026-11-01')).toBe('2026-10-31');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });
});

describe('the quẻ streak', () => {
  let database: DbHandle;
  let userId: string;
  const at = (iso: string): Date => new Date(iso);

  beforeAll(async () => {
    database = await openPglite();
    const [row] = await database.db.insert(users).values({ sub: 'streak-user', createdAt: new Date() }).returning({ id: users.id });
    if (!row) throw new Error('no user');
    userId = row.id;
  });
  afterAll(async () => {
    await database.close();
  });

  it('counts consecutive Vietnam days, ignores a second draw the same day and restarts after a gap', async () => {
    const { db } = database;
    expect(await readQueState(db, userId, at('2026-10-31T01:00:00Z'))).toEqual({ day: '2026-10-31', streak: 0, drawnToday: false });
    expect((await recordQueDraw(db, userId, at('2026-10-31T01:00:00Z'))).streak).toBe(1);
    expect((await recordQueDraw(db, userId, at('2026-10-31T16:00:00Z'))).streak).toBe(1);
    // 00:30 in Vietnam on 1 November is still 31 October in UTC: a new day here.
    expect(await readQueState(db, userId, at('2026-10-31T17:30:00Z'))).toEqual({ day: '2026-11-01', streak: 1, drawnToday: false });
    expect((await recordQueDraw(db, userId, at('2026-10-31T17:30:00Z'))).streak).toBe(2);
    expect((await recordQueDraw(db, userId, at('2026-11-02T03:00:00Z'))).streak).toBe(3);
    // A missed day: the streak reads 0 until the next draw starts it again.
    expect(await readQueState(db, userId, at('2026-11-04T03:00:00Z'))).toEqual({ day: '2026-11-04', streak: 0, drawnToday: false });
    expect(await recordQueDraw(db, userId, at('2026-11-04T03:00:00Z'))).toEqual({ day: '2026-11-04', streak: 1, drawnToday: true });
  });

  it('counts two draws at once as one', async () => {
    const { db } = database;
    const [row] = await db.insert(users).values({ sub: 'streak-race', createdAt: new Date() }).returning({ id: users.id });
    if (!row) throw new Error('no user');
    const now = at('2026-12-01T05:00:00Z');
    const results = await Promise.all([recordQueDraw(db, row.id, now), recordQueDraw(db, row.id, now)]);
    expect(results.map((r) => r.streak)).toEqual([1, 1]);
  });
});
