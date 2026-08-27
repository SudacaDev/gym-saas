CREATE TYPE "public"."lead_status" AS ENUM('nuevo', 'convertido', 'perdido');--> statement-breakpoint
CREATE TYPE "public"."operational_request_category" AS ENUM('supplies', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."operational_request_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "operational_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reported_by_user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"category" "operational_request_category",
	"status" "operational_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"note" text,
	"status" "lead_status" DEFAULT 'nuevo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operational_requests" ADD CONSTRAINT "operational_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_requests" ADD CONSTRAINT "operational_requests_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;