import { pgTable, uuid, text, date, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * A gym Member (the tenant's customer). Distinct from `users`: a `user`
 * row is an authenticated app principal (owner/staff/member role, tied to
 * a Supabase Auth account); a `member` is the person actually training at
 * the gym. `userId` is nullable because staff can register a walk-in
 * member before that person ever creates a login (self-serve member
 * portal is a later phase) — once they do, `userId` is backfilled by the
 * auth flow that links the Supabase account.
 */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    // Human-friendly visual identifier for front-desk operational use
    // (T-20260825-003) — e.g. "AB12CD" (2 letters + 2 digits + 2 letters,
    // see lib/members/generate-short-code.ts). Deliberately NOT the
    // auto-check-in numeric code from T-20260825-004 — a separate,
    // distinct field by explicit user decision, not unified with this one.
    // Unique per tenant (not globally): every query in this codebase is
    // already tenant-scoped via RLS/tenant_id, so a front-desk person only
    // ever sees codes within their own gym — global uniqueness would add
    // no real-world benefit here while needlessly shrinking the space
    // available to a single tenant with many locations/franchises sharing
    // one tenant row. NOT NULL: existing rows are backfilled deterministically
    // in the same migration (see db/migrations — hand-appended backfill,
    // same pattern as class_schedules.activity_id in T-20260821-008).
    shortCode: text("short_code").notNull(),
    // 6-digit numeric code for self-service auto-check-in (T-20260825-004)
    // — a member types this into the numeric pad on the existing
    // authenticated front-desk check-in screen (POST
    // /api/v1/checkins/self) instead of staff finding them by name/short
    // code and tapping "Check-in". Deliberately a SEPARATE field from
    // `shortCode` above, by explicit user decision — not unified: that
    // one is a display aid staff *reads*, this one is what a member
    // *types in themselves* to self-identify. Only 10^6 = 1,000,000
    // combinations per tenant (vs. shortCode's ~45.7M) — small enough to
    // be brute-forceable without the rate limiting enforced at the
    // endpoint (see lib/rate-limit/fixed-window-limiter.ts). Stored as
    // text, not a number, so leading zeros ("012345") round-trip exactly.
    // Unique per tenant (not globally) — same rationale and same
    // `(tenant_id, checkin_code)` shape as shortCode above. NOT NULL:
    // existing rows are backfilled deterministically in the same
    // migration (hand-appended backfill, same pattern as short_code's).
    checkinCode: text("checkin_code").notNull(),
    // Legal/health fields — visible to both owner and staff (confirmed with
    // the user 2026-08-21: front desk needs to see a health condition, not
    // just the owner). `dni` is Argentina's national ID; format is validated
    // at the zod layer (lib/validations/member.schema.ts), not the DB.
    birthDate: date("birth_date"),
    dni: text("dni"),
    medicalCertificateSubmitted: boolean("medical_certificate_submitted")
      .notNull()
      .default(false),
    healthNotes: text("health_notes"),
    // Compliance gate for the membership-reminder cron (T-20260824-003): when
    // true, no automatic reminder email is ever sent to this member,
    // regardless of how close their membership is to expiring. Manual sends
    // triggered by owner/staff are unaffected — this only opts out of the
    // automatic side. Defaults to false (opted in) since the reminder itself
    // is operationally useful to the member, not marketing.
    emailOptOut: boolean("email_opt_out").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete: a Member is never hard-deleted, since payment/checkin
    // history needs to survive them leaving the gym. NULL = active member;
    // set = "deleted" as far as the app is concerned. Every member-facing
    // query must filter `deletedAt IS NULL` explicitly — RLS scopes by
    // tenant, not by delete state.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("members_tenant_id_short_code_unique").on(
      table.tenantId,
      table.shortCode,
    ),
    uniqueIndex("members_tenant_id_checkin_code_unique").on(
      table.tenantId,
      table.checkinCode,
    ),
  ],
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
