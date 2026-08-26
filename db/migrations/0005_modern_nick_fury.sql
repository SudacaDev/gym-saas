ALTER TABLE "members" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "dni" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "medical_certificate_submitted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "health_notes" text;