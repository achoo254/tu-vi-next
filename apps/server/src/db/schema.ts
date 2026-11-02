import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * An account of the hoandat.com IdP that signed in here: its `sub`, and the name, email and picture its userinfo
 * gave at the latest sign-in (scope `openid profile email`), shown in the header's account menu. The three are
 * null for an account that has not signed in since the app started asking for them, or that has none.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  sub: text('sub').notNull().unique(),
  name: text('name'),
  email: text('email'),
  picture: text('picture'),
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

/**
 * The "Quẻ hôm nay" streak of an account: the latest Vietnam (UTC+7) day it drew its quẻ and how many days in a row
 * it has done so up to that day. One row per account; the quẻ itself is never stored (it is derived in the browser).
 */
export const queStreaks = pgTable('que_streaks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastDay: date('last_day', { mode: 'string' }).notNull(),
  streak: integer('streak').notNull(),
});

/**
 * Browsers that turned on the daily quẻ reminder (Web Push): the push service endpoint and the keys to encrypt for
 * it, one row per browser. An endpoint belongs to one browser, so it is unique: whoever turned the reminder on there
 * last gets it. `locale` is the language of the reminder's words. Deleted when turned off or when the push service
 * answers that the subscription is gone.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    locale: text('locale', { enum: ['vi', 'en'] }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('push_subscriptions_user_id_idx').on(table.userId)],
);

/** The latest Vietnam day the daily quẻ reminder went out to an account: claimed before sending, so at most once a day. */
export const queReminders = pgTable('que_reminders', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastDay: date('last_day', { mode: 'string' }).notNull(),
});
