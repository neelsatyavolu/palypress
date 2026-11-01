import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = new pg.Client({ connectionString });

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Creating calendar_accounts table...');
    await client.query(`
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
    `);

    console.log('Creating indexes for calendar_accounts...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calendar_account_user ON calendar_accounts(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calendar_account_user_email ON calendar_accounts(user_id, account_email);`);

    console.log('Creating calendar_preferences table...');
    await client.query(`
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
    `);

    console.log('Creating indexes for calendar_preferences...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calendar_pref_user ON calendar_preferences(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calendar_pref_account ON calendar_preferences(account_id);`);

    console.log('✅ Migration successful: Calendar tables created');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
