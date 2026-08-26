import { pgTable, uuid, time, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { activities } from "./activities";
import { dayOfWeekEnum } from "./enums";

/**
 * A single recurring weekly slot in a tenant's class schedule (e.g. "Lunes
 * 18:00-19:00 CrossFit"). v1 is deliberately declarative-only — day, time
 * range, activity — with no capacity, instructor, or booking/waitlist
 * concept. Those are a distinct, explicitly-scoped future decision, not an
 * incremental addition to this table (see T-20260821-004 in
 * .agents/graph/sessions/tasks.md for the product reasoning).
 *
 * `activityId` is a required FK to `activities` — the free-text
 * `activityName` column it replaced (T-20260821-008) is gone. That move
 * happened in two passes to avoid drizzle-kit's rename-detection heuristic
 * (a same-pass add+drop of similarly-shaped columns reads as a rename):
 * pass A added `activityId` nullable alongside `activityName` and
 * backfilled it from existing rows; this pass drops `activityName` and
 * makes `activityId` `NOT NULL` now that every row has one.
 */
export const classSchedules = pgTable("class_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ClassSchedule = typeof classSchedules.$inferSelect;
export type NewClassSchedule = typeof classSchedules.$inferInsert;
