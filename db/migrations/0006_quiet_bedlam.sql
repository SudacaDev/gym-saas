CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_schedules" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_tenant_id_name_unique" ON "activities" USING btree ("tenant_id","name");--> statement-breakpoint
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Hand-appended backfill (not drizzle-kit generated): one activities row
-- per distinct (tenant_id, activity_name) already present in
-- class_schedules, then point every existing row's activity_id at its
-- matching catalog row. See class-schedules.ts's docstring — activity_name
-- itself is dropped in a later, separate migration once this has run.
INSERT INTO "activities" ("tenant_id", "name")
SELECT DISTINCT "tenant_id", "activity_name" FROM "class_schedules"
ON CONFLICT ("tenant_id", "name") DO NOTHING;
--> statement-breakpoint
UPDATE "class_schedules" cs
SET "activity_id" = a."id"
FROM "activities" a
WHERE a."tenant_id" = cs."tenant_id" AND a."name" = cs."activity_name";