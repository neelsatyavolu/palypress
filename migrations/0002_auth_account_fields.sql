-- Bring existing databases in line with the current auth schema.
-- Keep this migration idempotent so it can be applied after older manual pushes.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS schoology_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS schoology_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS schoology_access_token_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS schoology_linked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP DEFAULT NOW() NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'password'
  ) THEN
    UPDATE users
    SET password_hash = password
    WHERE password_hash IS NULL
      AND password IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'is_verified'
  ) THEN
    UPDATE users
    SET email_verified = is_verified
    WHERE is_verified IS NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
