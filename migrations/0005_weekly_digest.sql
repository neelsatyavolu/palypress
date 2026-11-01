ALTER TABLE "users" ADD COLUMN "weekly_digest_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE "weekly_digest_state" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"last_sent_at" timestamp
);
