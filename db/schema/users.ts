import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { userRoleEnum } from "./enums";

/**
 * Local mirror of a Supabase Auth account's membership in a tenant. `role`
 * is the source of truth for business-role checks (see
 * lib/auth/require-role.ts) and is also stamped onto that user's
 * `auth.users.app_metadata.role` (see app/onboarding/actions.ts) so
 * middleware.ts can read it straight off the session without a DB round
 * trip.
 *
 * `authUserId` references `auth.users(id)` — Supabase Auth's own table, in
 * the same Postgres instance/database as everything else here. It's
 * deliberately declared as a plain `uuid`, NOT a Drizzle-managed foreign
 * key: `auth.users` lives in a schema owned and migrated by Supabase
 * itself (not by our drizzle-kit migrations), and a hard FK here would
 * also block tests/integration/tenant-isolation from seeding synthetic
 * users that aren't real Supabase auth accounts. Referential integrity in
 * practice is maintained by application code: the only writer of real ids
 * into this column is the Supabase-authenticated bootstrap/invite flow
 * (app/onboarding today; see the TODO in lib/auth/require-role.ts for
 * staff/member invites).
 *
 * Every business table (this one included) carries `tenant_id` AND is
 * covered by an RLS policy — see db/policies/.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    authUserId: uuid("auth_user_id").notNull(),
    role: userRoleEnum("role").notNull().default("member"),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // A given Supabase auth user is unique within a tenant (the same human
    // could in theory belong to several gyms/tenants as separate rows).
    uniqueIndex("users_tenant_auth_user_idx").on(
      table.tenantId,
      table.authUserId,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
