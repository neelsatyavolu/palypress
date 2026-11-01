CREATE TABLE "app_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_feedback" ADD CONSTRAINT "app_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_app_feedback_user" ON "app_feedback" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_app_feedback_created_at" ON "app_feedback" USING btree ("created_at" DESC);
