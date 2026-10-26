import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { sessions, users } from '../db/schema';

export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 14 * 24 * 60 * 60 * 1000;
/** Refresh `last_seen_at` at most this often, to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export type SessionRow = typeof sessions.$inferSelect;

/** Only the sha256 of the session token is stored, so a database leak does not hand out live sessions. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The user row of an IdP account, created on its first sign-in. */
export async function upsertUser(db: Db, sub: string, now: Date): Promise<string> {
  const [created] = await db.insert(users).values({ sub, createdAt: now }).onConflictDoNothing({ target: users.sub }).returning({ id: users.id });
  if (created) return created.id;
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.sub, sub));
  if (!existing) throw new Error('user upsert found no row');
  return existing.id;
}

export async function createSession(db: Db, userId: string, now: Date): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
  });
  return token;
}

/** The live session of a token; expired ones (absolute or idle) are deleted. */
export async function findSession(db: Db, token: string, now: Date): Promise<SessionRow | null> {
  const id = hashToken(token);
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) return null;
  const idleExpired = now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS;
  if (session.expiresAt.getTime() <= now.getTime() || idleExpired) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
  }
  return session;
}

export async function deleteSessionByToken(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
