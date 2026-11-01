import session from "express-session";
import { sql } from "./db";

// Same table layout connect-pg-simple created on Railway, so existing rows
// and the table restored from the Railway dump keep working.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Callback<T = unknown> = (err?: unknown, value?: T) => void;

function expiresAt(sess: session.SessionData): Date {
  const expires = sess.cookie?.expires;
  if (expires) return new Date(expires);
  const maxAge = sess.cookie?.maxAge;
  return new Date(Date.now() + (typeof maxAge === "number" ? maxAge : ONE_DAY_MS));
}

export class NeonSessionStore extends session.Store {
  private tableReady: Promise<void> | null = null;

  private ensureTable(): Promise<void> {
    this.tableReady ??= (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          sid varchar NOT NULL PRIMARY KEY,
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        )`;
      await sql`
        CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire"
        ON user_sessions (expire)`;
    })().catch((error) => {
      this.tableReady = null;
      throw error;
    });
    return this.tableReady;
  }

  private run<T>(work: () => Promise<T>, callback?: Callback<T>): void {
    this.ensureTable()
      .then(work)
      .then(
        (value) => callback?.(null, value),
        (error) => callback?.(error),
      );
  }

  get(sid: string, callback: Callback<session.SessionData | null>): void {
    this.run(async () => {
      const rows = await sql`
        SELECT sess FROM user_sessions
        WHERE sid = ${sid} AND expire >= now()`;
      return (rows[0]?.sess as session.SessionData | undefined) ?? null;
    }, callback);
  }

  set(sid: string, sess: session.SessionData, callback?: Callback): void {
    this.run(async () => {
      await sql`
        INSERT INTO user_sessions (sid, sess, expire)
        VALUES (${sid}, ${JSON.stringify(sess)}::json, ${expiresAt(sess).toISOString()})
        ON CONFLICT (sid) DO UPDATE
        SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`;
    }, callback);
  }

  destroy(sid: string, callback?: Callback): void {
    this.run(async () => {
      await sql`DELETE FROM user_sessions WHERE sid = ${sid}`;
    }, callback);
  }

  touch(sid: string, sess: session.SessionData, callback?: Callback): void {
    this.run(async () => {
      await sql`
        UPDATE user_sessions SET expire = ${expiresAt(sess).toISOString()}
        WHERE sid = ${sid}`;
    }, callback);
  }
}

export async function pruneExpiredSessions(): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE expire < now()`;
}
