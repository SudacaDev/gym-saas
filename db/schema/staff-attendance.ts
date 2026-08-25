import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { staffMembers } from "./staff-members";

/**
 * A single clock-in/clock-out event for a StaffMember (T-20260825-005).
 * FK targets `staffMembers.id`, not `users.id` — this is HR/schedule data
 * tied specifically to the staff role, same convention as the rest of
 * db/schema/staff-members.ts.
 *
 * Mirrors db/schema/checkins.ts's open-row pattern exactly: clocking in
 * inserts a row with `clockIn` set and `clockOut` NULL; clocking out
 * updates that same row's `clockOut` once, via PATCH
 * app/api/v1/staff/[id]/attendance/[attendanceId]/route.ts. Never
 * auto-expired server-side — an open row from a previous day is simply
 * still "open" until someone explicitly clocks out (or, per the same
 * caveat as checkins, is treated as stale by anything that cares about
 * "who's clocked in right now").
 *
 * There is deliberately no self-service path to write this table in this
 * pass — clock-in/out is an administrative action taken by the owner or
 * another staff member on someone else's behalf, from the "Equipo" staff
 * list (features/staff-page/index.tsx). See the route handlers for the
 * owner-vs-owner+staff permission decision.
 */
export const staffAttendance = pgTable("staff_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  staffMemberId: uuid("staff_member_id")
    .notNull()
    .references(() => staffMembers.id, { onDelete: "cascade" }),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull().defaultNow(),
  // Null while the person is still clocked in. Set once, via PATCH — never
  // auto-expired in the DB itself, same convention as checkins.checkedOutAt.
  clockOut: timestamp("clock_out", { withTimezone: true }),
});

export type StaffAttendance = typeof staffAttendance.$inferSelect;
export type NewStaffAttendance = typeof staffAttendance.$inferInsert;
