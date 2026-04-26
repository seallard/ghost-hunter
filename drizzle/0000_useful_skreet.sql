CREATE TYPE "public"."application_status" AS ENUM('applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn', 'ghosted');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "application_status" NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"role" text NOT NULL,
	"job_description" text NOT NULL,
	"status" "application_status" NOT NULL,
	"resume_text" text,
	"cover_letter_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_events_app_occurred_idx" ON "application_events" USING btree ("application_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "application_events_user_idx" ON "application_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_user_created_idx" ON "applications" USING btree ("user_id","created_at" DESC NULLS LAST);