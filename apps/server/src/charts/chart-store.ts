import type { BirthInput } from '@tuvi/chart/input';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { charts, users } from '../db/schema';

/** Saved charts per account. */
export const MAX_CHARTS_PER_USER = 50;

export interface SavedChart {
  id: string;
  createdAt: string;
  input: BirthInput;
}

type ChartRow = typeof charts.$inferSelect;

function toSavedChart(row: ChartRow): SavedChart {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    input: {
      name: row.name,
      calendar: row.calendar,
      year: row.year,
      month: row.month,
      day: row.day,
      isLeapMonth: row.isLeapMonth,
      hour: row.hour,
      minute: row.minute,
      gender: row.gender,
    },
  };
}

export async function listCharts(db: Db, userId: string): Promise<SavedChart[]> {
  const rows = await db.select().from(charts).where(eq(charts.userId, userId)).orderBy(desc(charts.createdAt));
  return rows.map(toSavedChart);
}

/** Saves a chart, or returns 'limit' when the account already has MAX_CHARTS_PER_USER. */
export async function saveChart(db: Db, userId: string, input: BirthInput, now: Date): Promise<SavedChart | 'limit'> {
  return db.transaction(async (tx) => {
    // Lock the account row so two saves at once cannot both pass the count.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    const [counted] = await tx.select({ n: sql<number>`count(*)::int` }).from(charts).where(eq(charts.userId, userId));
    if ((counted?.n ?? 0) >= MAX_CHARTS_PER_USER) return 'limit';
    const [row] = await tx
      .insert(charts)
      .values({ userId, ...input, createdAt: now })
      .returning();
    if (!row) throw new Error('chart insert returned no row');
    return toSavedChart(row);
  });
}

/** Deletes one of the account's charts; false when it has no chart with that id. */
export async function deleteChart(db: Db, userId: string, chartId: string): Promise<boolean> {
  const removed = await db
    .delete(charts)
    .where(and(eq(charts.id, chartId), eq(charts.userId, userId)))
    .returning({ id: charts.id });
  return removed.length > 0;
}
