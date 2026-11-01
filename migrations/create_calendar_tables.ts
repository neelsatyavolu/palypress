import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function migrate() {
  console.log("Creating calendar_accounts table...");

  await sql`
    CREATE TABLE IF NOT EXISTS calendar_accounts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_email TEXT NOT NULL,
      account_name TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      is_enabled BOOLEAN DEFAULT true NOT NULL,
      is_primary BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `;

  console.log("Creating indexes for calendar_accounts...");
  await sql`CREATE INDEX IF NOT EXISTS idx_calendar_account_user ON calendar_accounts(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_calendar_account_user_email ON calendar_accounts(user_id, account_email);`;

  console.log("Creating calendar_preferences table...");

  await sql`
    CREATE TABLE IF NOT EXISTS calendar_preferences (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id VARCHAR NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
      calendar_id TEXT NOT NULL,
      calendar_name TEXT NOT NULL,
      calendar_color TEXT,
      is_enabled BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      CONSTRAINT unique_user_calendar UNIQUE (user_id, account_id, calendar_id)
    );
  `;

  console.log("Creating indexes for calendar_preferences...");
  await sql`CREATE INDEX IF NOT EXISTS idx_calendar_pref_user ON calendar_preferences(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_calendar_pref_account ON calendar_preferences(account_id);`;

  console.log("Migration successful: Calendar tables created");
  await sql.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
