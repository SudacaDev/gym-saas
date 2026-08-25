import { pgTable, uuid, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { staffCategoryEnum, staffDepartmentEnum, staffShiftEnum } from "./enums";

/**
 * HR-adjacent record for a StaffMember (instructor/administrative/cleaning)
 * — one row per `users` row with `role = 'staff'`. `userId` is a required,
 * unique FK: a `staff_members` row only ever exists for a real Supabase
 * Auth account, created through the owner-driven creation flow
 * (app/api/v1/staff/route.ts), never for a placeholder/mock person.
 *
 * As of T-20260825-002 that flow uses `admin.auth.admin.createUser()` with
 * an owner-supplied password (`email_confirm: true`, no invite email round
 * trip) — this REPLACES the invite-by-email design from T-20260821-007,
 * where the new hire set their own password. See
 * `.agents/graph/gates/pending/T-20260825-002.md` for the security
 * tradeoff — this was an explicit, confirmed choice by the user despite
 * knowing it's normally an antipattern (the owner now knows the
 * employee's password).
 *
 * `username` is a separate, app-level identity concept from `email` (which
 * remains the real Supabase Auth login identifier — this pass does not add
 * a second login path). Display-only for now. Unique per tenant, same
 * pattern as `members.shortCode`/`members.checkinCode` (see
 * db/schema/members.ts) — every query here is already tenant-scoped via
 * RLS, so global uniqueness would add no real benefit.
 *
 * Category-specific columns (specialties/certifications for instructor,
 * department for administrative, shift for cleaning) are all nullable —
 * only the ones matching `staffCategory` are populated; the app layer
 * (lib/validations/staff-member.schema.ts) enforces that, not the DB.
 *
 * Soft delete via `deletedAt`, same convention as db/schema/members.ts —
 * never hard-deleted, since schedules/classes may reference this person.
 * NULL = active.
 */
export const staffMembers = pgTable(
  "staff_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    staffCategory: staffCategoryEnum("staff_category").notNull(),
    // App-level display identity, separate from `users.email` (the real
    // Supabase Auth login). Not used for login in this pass — see the
    // table-level doc comment above.
    username: text("username").notNull(),
    phone: text("phone"),
    dni: text("dni"),
    hireDate: date("hire_date"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    // Instructor-only
    specialties: text("specialties").array(),
    certifications: text("certifications"),
    certificationExpiresAt: date("certification_expires_at"),
    // Administrative-only
    department: staffDepartmentEnum("department"),
    // Cleaning-only
    shift: staffShiftEnum("shift"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("staff_members_user_id_unique").on(table.userId),
    uniqueIndex("staff_members_tenant_id_username_unique").on(
      table.tenantId,
      table.username,
    ),
  ],
);

export type StaffMember = typeof staffMembers.$inferSelect;
export type NewStaffMember = typeof staffMembers.$inferInsert;
