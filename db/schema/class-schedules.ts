import { pgTable, uuid, time, integer, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { activities } from "./activities";
import { staffMembers } from "./staff-members";
import { dayOfWeekEnum } from "./enums";

/**
 * A single recurring weekly slot in a tenant's class schedule (e.g. "Lunes
 * 18:00-19:00 CrossFit"). v1 was deliberately declarative-only — day, time
 * range, activity — with no capacity, instructor, or booking/waitlist
 * concept (see T-20260821-004 for that original reasoning). T-20260826-011
 * adds `capacity` as the default aforo for every occurrence of this slot;
 * booking/waitlist itself lives in class_occurrences/class_reservations,
 * not here — this table still only describes the recurring slot, never a
 * specific date.
 *
 * `activityId` is a required FK to `activities` — the free-text
 * `activityName` column it replaced (T-20260821-008) is gone. That move
 * happened in two passes to avoid drizzle-kit's rename-detection heuristic
 * (a same-pass add+drop of similarly-shaped columns reads as a rename):
 * pass A added `activityId` nullable alongside `activityName` and
 * backfilled it from existing rows; this pass drops `activityName` and
 * makes `activityId` `NOT NULL` now that every row has one.
 *
 * `instructorId` (T-20260827-007) reverses the earlier "no instructor
 * concept" call above — nullable, since existing/legacy slots and any
 * owner-run class have no instructor to assign. `onDelete: "set null"`
 * rather than `"restrict"`/`"cascade"`: staff_members is soft-deleted
 * (never a real DELETE — see its own docstring), but this still keeps the
 * schedule row alive and instructor-less rather than erroring or vanishing
 * a class if that ever changes.
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
  // Default aforo for every occurrence of this slot (T-20260826-011). Null
  // = no cap enforced. A specific occurrence can override it — see
  // class_occurrences.capacity.
  capacity: integer("capacity"),
  instructorId: uuid("instructor_id").references(() => staffMembers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ClassSchedule = typeof classSchedules.$inferSelect;
export type NewClassSchedule = typeof classSchedules.$inferInsert;
