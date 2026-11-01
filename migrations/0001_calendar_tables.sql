-- Create calendar_accounts table
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

CREATE INDEX IF NOT EXISTS idx_calendar_account_user ON calendar_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_account_user_email ON calendar_accounts(user_id, account_email);

-- Create calendar_preferences table
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

CREATE INDEX IF NOT EXISTS idx_calendar_pref_user ON calendar_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_pref_account ON calendar_preferences(account_id);
