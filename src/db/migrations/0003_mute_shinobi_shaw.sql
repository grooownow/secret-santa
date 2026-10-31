CREATE TYPE "public"."gift_place" AS ENUM('locker', 'mailbox');--> statement-breakpoint
CREATE TYPE "public"."participant_kind" AS ENUM('adult', 'child');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('verify', 'reset');--> statement-breakpoint
CREATE TABLE "assignments" (
	"receiver_id" uuid PRIMARY KEY NOT NULL,
	"giver_id" uuid,
	"gift_place" "gift_place",
	"gift_code" text,
	"gift_note" text,
	"gift_left_at" timestamp with time zone,
	"not_found_at" timestamp with time zone,
	"backup_organized_at" timestamp with time zone,
	"reassigned_at" timestamp with time zone,
	CONSTRAINT "assignments_giver_id_unique" UNIQUE("giver_id")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "guesses" (
	"participant_id" uuid PRIMARY KEY NOT NULL,
	"guessed_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "participant_kind" NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"photo_url" text,
	"wishes" text DEFAULT '' NOT NULL,
	"avoid" text DEFAULT '' NOT NULL,
	"child_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_emails" (
	"key" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"applications_close_on" text NOT NULL,
	"draw_on" text NOT NULL,
	"gifts_start_on" text NOT NULL,
	"gifts_end_on" text NOT NULL,
	"reveal_on" text NOT NULL,
	"close_on" text NOT NULL,
	"drawn_at" timestamp with time zone,
	"purged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wall_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"text" text NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "building" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "apartment" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_version" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_guessed_id_participants_id_fk" FOREIGN KEY ("guessed_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_one_adult_per_user" ON "participants" USING btree ("user_id") WHERE "participants"."kind" = 'adult';