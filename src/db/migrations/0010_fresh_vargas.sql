CREATE TYPE "public"."child_gender" AS ENUM('boy', 'girl');--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "gender" "child_gender";