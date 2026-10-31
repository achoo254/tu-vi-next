CREATE TABLE "que_streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"last_day" date NOT NULL,
	"streak" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "que_streaks" ADD CONSTRAINT "que_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;