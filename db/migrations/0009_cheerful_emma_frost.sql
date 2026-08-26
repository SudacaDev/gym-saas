CREATE TYPE "public"."staff_category" AS ENUM('instructor', 'administrative', 'cleaning');--> statement-breakpoint
CREATE TYPE "public"."staff_department" AS ENUM('reception', 'sales', 'billing', 'management');--> statement-breakpoint
CREATE TYPE "public"."staff_shift" AS ENUM('morning', 'afternoon', 'night', 'rotating');--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"staff_category" "staff_category" NOT NULL,
	"phone" text,
	"dni" text,
	"hire_date" date,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"specialties" text[],
	"certifications" text,
	"certification_expires_at" date,
	"department" "staff_department",
	"shift" "staff_shift",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_user_id_unique" ON "staff_members" USING btree ("user_id");