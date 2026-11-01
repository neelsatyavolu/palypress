CREATE TABLE "publication_follows" (
	"user_id" varchar NOT NULL,
	"publication_id" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "publication_follows_user_id_publication_id_pk" PRIMARY KEY("user_id","publication_id")
);
--> statement-breakpoint
ALTER TABLE "publication_follows" ADD CONSTRAINT "publication_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_follows_user" ON "publication_follows" USING btree ("user_id");
