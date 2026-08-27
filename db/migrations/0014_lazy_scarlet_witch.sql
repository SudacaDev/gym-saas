CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'waitlisted', 'attended', 'absent', 'cancelled');--> statement-breakpoint
CREATE TABLE "class_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_schedule_id" uuid NOT NULL,
	"date" date NOT NULL,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_occurrence_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "reservation_status" DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_schedules" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "class_occurrences" ADD CONSTRAINT "class_occurrences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_occurrences" ADD CONSTRAINT "class_occurrences_class_schedule_id_class_schedules_id_fk" FOREIGN KEY ("class_schedule_id") REFERENCES "public"."class_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_reservations" ADD CONSTRAINT "class_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_reservations" ADD CONSTRAINT "class_reservations_class_occurrence_id_class_occurrences_id_fk" FOREIGN KEY ("class_occurrence_id") REFERENCES "public"."class_occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_reservations" ADD CONSTRAINT "class_reservations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_occurrences_schedule_date_unique" ON "class_occurrences" USING btree ("tenant_id","class_schedule_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "class_reservations_active_unique" ON "class_reservations" USING btree ("class_occurrence_id","member_id") WHERE "class_reservations"."status" <> 'cancelled';