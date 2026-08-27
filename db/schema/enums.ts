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
 *
 * Audited for `reception` in T-20260826-014 (see
 * `.agents/graph/gates/pending/T-20260826-014.md`): every one of the
 * user-specified "recepción NO puede" actions (crear planes, cambiar
 * precios, borrar pagos históricos, ver facturación mensual, liquidar
 * sueldos) is already unreachable for *any* `staff` role today — either
 * gated `owner`-only (plans/products create+price, dashboard revenue,
 * walk-in-sales totals) or not implemented at all (no payment DELETE
 * endpoint, no payroll/liquidación concept in the schema). So no
 * `department`-based second gate was needed for `reception` specifically.
 * `sales`/`billing`/`management` remain unaudited — their rules aren't
 * defined yet, don't assume parity with `reception` here.
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

/**
 * Lifecycle of a ClassReservation (T-20260826-011). "reserved" occupies a
 * capacity slot; "waitlisted" doesn't. Freeing a "reserved" slot (moving to
 * "absent" or "cancelled") atomically promotes the oldest "waitlisted" row
 * for the same occurrence — see app/api/v1/schedules/[id]/occurrences/
 * reservations/[reservationId]/route.ts. "attended" is a terminal,
 * capacity-occupying state (marking someone present doesn't free their
 * slot — they showed up, they used it).
 */
export const reservationStatusEnum = pgEnum("reservation_status", [
  "reserved",
  "waitlisted",
  "attended",
  "absent",
  "cancelled",
]);

/**
 * What a WalkInSale row is: a catalog `product` (references `products`) or
 * a one-off `day_pass` (no catalog entry — see T-20260826-012's product
 * decision: a day pass is a deliberately lightweight, standalone concept,
 * not a 1-day Membership).
 */
export const walkInSaleKindEnum = pgEnum("walk_in_sale_kind", [
  "product",
  "day_pass",
]);

/**
 * Optional bucket for an OperationalRequest (T-20260826-010) — "insumos"
 * (cleaning supplies, office stuff) vs. "mantenimiento" (equipment/facility
 * repair). Nullable at the column level (see db/schema/operational-requests.ts):
 * not every report neatly fits one of these two, and forcing a choice was
 * never asked for.
 */
export const operationalRequestCategoryEnum = pgEnum(
  "operational_request_category",
  ["supplies", "maintenance"],
);

/**
 * Lifecycle of an OperationalRequest (T-20260826-010). Deliberately just
 * two states — no approval workflow, no "in_progress" — that would be
 * scope nobody asked for. "resolved" is a manual toggle by staff/owner,
 * not driven by any automated process.
 */
export const operationalRequestStatusEnum = pgEnum(
  "operational_request_status",
  ["open", "resolved"],
);

/**
 * Outcome of a Lead (T-20260826-013) — a walk-in prospect captured at the
 * counter. "nuevo" is the default on creation; staff/owner move it to
 * "convertido" or "perdido" manually as follow-up happens. No automated
 * transition — this project has no WhatsApp/email automation wired to
 * leads yet (deliberately out of scope, see db/schema/leads.ts).
 */
export const leadStatusEnum = pgEnum("lead_status", [
  "nuevo",
  "convertido",
  "perdido",
]);
