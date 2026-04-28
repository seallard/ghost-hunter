ALTER TABLE "applications" RENAME COLUMN "contact_name" TO "contact";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "contact_url";