ALTER TABLE "applications" ADD COLUMN "resume_object_key" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_mime" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cover_letter_object_key" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cover_letter_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cover_letter_mime" text;