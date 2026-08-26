import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A Tenant is purely internal to this app — there is no external
 * "Organization" concept from the auth provider backing it (Supabase Auth
 * has no such concept; see db/schema/users.ts for how a User ties back to
 * a Supabase auth.users account). It's created during onboarding (see
 * app/onboarding) and its id is stamped onto the owning user's
 * `app_metadata.tenant_id` via the Supabase Admin API so middleware.ts can
 * read it on every request.
 *
 * `tenants` itself carries no `tenant_id` and no RLS policy — a row here
 * IS the tenant boundary, there is nothing to isolate it from.
 */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
