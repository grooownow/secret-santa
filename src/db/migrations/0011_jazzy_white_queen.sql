ALTER TABLE "assignments" ADD COLUMN "backup_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "backup_volunteer_id" uuid;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "exit_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "exit_comment" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "backup_volunteer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_backup_volunteer_id_users_id_fk" FOREIGN KEY ("backup_volunteer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;