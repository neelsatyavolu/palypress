CREATE TABLE "article_upvotes" (
	"user_id" varchar NOT NULL,
	"article_id" integer NOT NULL,
	"publication_id" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "article_upvotes_user_id_article_id_publication_id_pk" PRIMARY KEY("user_id","article_id","publication_id")
);
--> statement-breakpoint
CREATE TABLE "last_notification_check" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"publication_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"category_ids" integer[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_publication_id_unique" UNIQUE("user_id","publication_id")
);
--> statement-breakpoint
CREATE TABLE "saved_articles" (
	"user_id" varchar NOT NULL,
	"article_id" integer NOT NULL,
	"article_title" text NOT NULL,
	"article_excerpt" text,
	"article_author" text,
	"article_date" text,
	"article_image_url" text,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_articles_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"display_name" text,
	"verification_code" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "article_upvotes" ADD CONSTRAINT "article_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "last_notification_check" ADD CONSTRAINT "last_notification_check_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_upvotes_lookup" ON "article_upvotes" USING btree ("publication_id","article_id");--> statement-breakpoint
CREATE INDEX "idx_upvotes_created_at" ON "article_upvotes" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notification_prefs_user_enabled" ON "notification_preferences" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE INDEX "idx_saved_at" ON "saved_articles" USING btree ("saved_at" DESC NULLS LAST);