-- Sign in with Apple (App Store guideline 4.8)
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_apple_id_unique ON users (apple_id);
