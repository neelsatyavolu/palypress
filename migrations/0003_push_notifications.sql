CREATE TABLE "notification_feed_state" (
	"publication_id" text PRIMARY KEY NOT NULL,
	"latest_article_id" integer NOT NULL,
	"latest_article_published_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_notification_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"expo_push_token" text NOT NULL,
	"platform" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_registered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_notification_devices_expo_push_token_unique" UNIQUE("expo_push_token")
);
--> statement-breakpoint
ALTER TABLE "push_notification_devices" ADD CONSTRAINT "push_notification_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_push_devices_user" ON "push_notification_devices" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_push_devices_token" ON "push_notification_devices" USING btree ("expo_push_token");
--> statement-breakpoint
DROP TABLE "last_notification_check";
