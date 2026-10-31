ALTER TABLE "sent_emails" ALTER COLUMN "sent_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sent_emails" ALTER COLUMN "sent_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sent_emails" ADD COLUMN "claimed_at" timestamp with time zone DEFAULT now() NOT NULL;