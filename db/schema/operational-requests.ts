import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { operationalRequestCategoryEnum, operationalRequestStatusEnum } from "./enums";

/**
 * A need/issue reported from the floor by staff (T-20260826-010) — e.g.
 * "faltan elementos de limpieza", "esta máquina necesita mantenimiento".
 * Deliberately minimal: no approval workflow, no notifications (not asked
 * for — sobre-alcance). The owner's own dedicated view of these is out of
 * scope here too — explicitly confirmed as "más adelante".
 *
 * `reportedByUserId` follows `emailSendLog.triggeredByUserId`'s precedent
 * for "who did this" (FK to the tenant-local `users.id`, NOT the Supabase
 * Auth id — see users.ts's docstring on that distinction), but NOT NULL
 * here: unlike a reminder email (which can also fire unattended from a
 * cron), a request is always typed in by an authenticated staff/owner
 * session, so there's no "no acting user" case to leave room for.
 * `onDelete: "restrict"` rather than "cascade": this codebase has no
 * delete path for a `users` row today (staff are soft-deleted via
 * `staff_members.deletedAt`, never their `users` row), so this is a
 * conservative default that isn't expected to actually be exercised,
 * chosen to avoid silently losing report history if that ever changes.
 *
 * Permissions (app/api/v1/operational-requests/**): owner+staff for
 * GET/POST/PATCH — same base tier as the rest of front-desk/floor data
 * (checkins, walk-in-sales' POST). No extra restriction by
 * `staffCategory`/`department` — that axis (T-20260826-014) isn't
 * implemented yet and wasn't asked for here.
 */
export const operationalRequests = pgTable("operational_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  reportedByUserId: uuid("reported_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  description: text("description").notNull(),
  category: operationalRequestCategoryEnum("category"),
  status: operationalRequestStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OperationalRequest = typeof operationalRequests.$inferSelect;
export type NewOperationalRequest = typeof operationalRequests.$inferInsert;
