import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** An account of the hoandat.com IdP that signed in here; only its `sub` is known (scope openid). */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  sub: text('sub').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

/** Web sessions. `id` is the sha256 of the opaque cookie token, never the token itself. */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

/** Saved charts: only what the person entered; the chart itself is cast again in the browser. */
export const charts = pgTable(
  'charts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    calendar: text('calendar', { enum: ['solar', 'lunar'] }).notNull(),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    day: integer('day').notNull(),
    isLeapMonth: boolean('is_leap_month').notNull(),
    hour: integer('hour').notNull(),
    minute: integer('minute').notNull(),
    gender: text('gender', { enum: ['male', 'female'] }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('charts_user_id_created_at_idx').on(table.userId, table.createdAt)],
);
