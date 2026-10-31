ALTER TABLE "auth_tokens" ADD COLUMN "pending_password_hash" text;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD COLUMN "pending_locale" text;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD COLUMN "pending_consent_version" text;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD COLUMN "pending_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;