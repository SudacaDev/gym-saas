import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Business role of a User within its tenant — also stamped onto the
 * matching Supabase auth.users.app_metadata.role (see db/schema/users.ts).
 */
export const userRoleEnum = pgEnum("user_role", ["owner", "staff", "member"]);

/**
 * Lifecycle status of a Membership (a Member subscribed to a Plan).
 */
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "paused",
  "cancelled",
  "expired",
]);

/**
 * Billing periodicity of a Plan.
 */
export const planPeriodEnum = pgEnum("plan_period", [
  "monthly",
  "quarterly",
  "yearly",
]);

/**
 * Status of a Payment record. Payments are append-only: a failed or
 * refunded payment is a new row, never an update of monto/estado in place
 * beyond this status field.
 */
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

/**
 * How a Checkin was performed. "self_code" (T-20260825-004) is the
 * front-desk auto-check-in flow: a member types their own 6-digit
 * `members.checkinCode` on the same authenticated check-in screen staff
 * already uses, instead of staff finding them by name/short code and
 * tapping "Check-in" — see app/api/v1/checkins/self/route.ts. Kept
 * distinct from "manual" on purpose even though both insert through a
 * staff/owner-authenticated session (same `requireRole` gate): who
 * actually identified the member (staff picking a name vs. the member
 * typing a code themselves) is operationally worth reporting on
 * separately, and this is cheap to add now vs. reconstructing it later
 * from a mixed "manual" bucket. Adding this value to an existing enum
 * needs its own `ALTER TYPE ... ADD VALUE` migration statement (produced
 * automatically by `drizzle-kit generate` — no prior ALTER TYPE existed
 * in this codebase's migrations to mirror, this is the first one).
 */
export const checkinMethodEnum = pgEnum("checkin_method", [
  "manual",
  "qr",
  "nfc",
  "self_code",
]);

/**
 * How an EmailSendLog row was triggered: "reminder" for the automatic
 * membership-expiration cron, "manual" for an owner/staff click.
 */
export const emailSendTypeEnum = pgEnum("email_send_type", [
  "reminder",
  "manual",
]);

/**
 * Outcome of one email send attempt logged in EmailSendLog.
 */
export const emailSendStatusEnum = pgEnum("email_send_status", [
  "sent",
  "failed",
]);

/**
 * Which specialized form a StaffMember's category-specific fields take.
 * Drives which of the nullable columns on `staff_members` are populated —
 * see db/schema/staff-members.ts.
 */
export const staffCategoryEnum = pgEnum("staff_category", [
  "instructor",
  "administrative",
  "cleaning",
]);

/**
 * Area/función for an "administrative" StaffMember. Access itself is
 * governed by the `user_role` (owner/staff), not this — it's descriptive
 * metadata only.
 */
export const staffDepartmentEnum = pgEnum("staff_department", [
  "reception",
  "sales",
  "billing",
  "management",
]);

/**
 * Usual shift for a "cleaning" StaffMember.
 */
export const staffShiftEnum = pgEnum("staff_shift", [
  "morning",
  "afternoon",
  "night",
  "rotating",
]);

/**
 * Day a ClassSchedule slot recurs on, within its tenant's weekly schedule.
 */
export const dayOfWeekEnum = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
