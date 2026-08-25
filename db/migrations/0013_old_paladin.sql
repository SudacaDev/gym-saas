CREATE TABLE "staff_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"clock_in" timestamp with time zone DEFAULT now() NOT NULL,
	"clock_out" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;