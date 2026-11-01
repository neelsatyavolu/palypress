-- App Store guideline 1.2: comment reports, author blocks, account suspension
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;

CREATE TABLE IF NOT EXISTS "comment_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" varchar,
	"publication_id" varchar(50) NOT NULL,
	"article_id" integer NOT NULL,
	"comment_id" integer NOT NULL,
	"comment_author_id" integer DEFAULT 0 NOT NULL,
	"comment_author_name" text NOT NULL,
	"comment_author_key" text NOT NULL,
	"comment_excerpt" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comment_reports_status" ON "comment_reports" USING btree ("status","created_at" DESC);

CREATE TABLE IF NOT EXISTS "user_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" varchar NOT NULL,
	"publication_id" varchar(50) NOT NULL,
	"blocked_author_key" text NOT NULL,
	"blocked_author_name" text NOT NULL,
	"source_comment_id" integer,
	"source_article_id" integer,
	"source_excerpt" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_unique" ON "user_blocks" USING btree ("blocker_id","publication_id","blocked_author_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_blocks_blocker" ON "user_blocks" USING btree ("blocker_id");
