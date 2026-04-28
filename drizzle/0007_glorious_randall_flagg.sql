CREATE TYPE "public"."work_mode" AS ENUM('in_office', 'hybrid', 'remote');--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "work_mode" "work_mode";