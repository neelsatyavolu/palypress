-- Remove Schoology integration: grades/schedule sync is no longer supported.
-- Keep this migration idempotent so it can be applied regardless of prior state.

DROP TABLE IF EXISTS schoology_courses;
DROP TABLE IF EXISTS schoology_oauth_temp;

ALTER TABLE users DROP COLUMN IF EXISTS schoology_user_id;
ALTER TABLE users DROP COLUMN IF EXISTS schoology_access_token;
ALTER TABLE users DROP COLUMN IF EXISTS schoology_access_token_secret;
ALTER TABLE users DROP COLUMN IF EXISTS schoology_linked_at;
