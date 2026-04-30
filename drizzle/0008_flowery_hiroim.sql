CREATE TYPE "public"."interview_format" AS ENUM('phone', 'video', 'onsite');--> statement-breakpoint
ALTER TABLE "application_events" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "application_events" ADD COLUMN "format" "interview_format";