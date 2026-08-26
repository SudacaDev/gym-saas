import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Two connections, two roles — this split is what makes RLS real instead
 * of decorative:
 *
 *  - getDb() connects as the TRUSTED role (DATABASE_TRUSTED_URL). In
 *    Supabase this is the `postgres` role, which has `rolbypassrls = true`
 *    — RLS never applies to it, full stop, regardless of FORCE ROW LEVEL
 *    SECURITY. Only ever use it directly for: the onboarding bootstrap
 *    flow (app/onboarding/actions.ts) — creating the very first
 *    `tenants`/`users` rows, which has no tenant context to set yet;
 *    migrations / scripts/apply-policies.ts / scripts/setup-app-role.ts;
 *    tests seeding fixtures.
 *
 *  - getScopedDb() connects as `app_user` (DATABASE_URL) — an ordinary,
 *    unprivileged login role created by scripts/setup-app-role.ts. RLS
 *    applies to it unconditionally. This is the ONLY client
 *    db/rls-context.ts's withTenantContext() is allowed to use.
 *
 * ALL business-data reads/writes (anything touching users, members, plans,
 * memberships, payments, checkins) MUST go through withTenantContext, not
 * getDb() directly, or RLS has nothing to key on (and, since that path is
 * the bypassing role anyway, would see every tenant's rows).
 */

function readUrl(envVar: string): string {
  const url = process.env[envVar];
  if (!url) {
    throw new Error(
      `${envVar} is not set. Copy .env.local.example to .env.local, point ` +
        "it at your Supabase (or any Postgres) database, and run " +
        "`npm run db:setup-role` to create the app_user role.",
    );
  }
  return url;
}

// Lazily create the underlying postgres.js connection pools so that
// importing this module never throws just because env vars aren't loaded
// yet (e.g. at build time, or before Next.js has read .env.local).
let _trustedClient: postgres.Sql | undefined;
let _trustedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
let _scopedClient: postgres.Sql | undefined;
let _scopedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Elevated/trusted Drizzle instance — see module docstring for when. */
export function getDb() {
  if (!_trustedDb) {
    _trustedClient ??= postgres(readUrl("DATABASE_TRUSTED_URL"), {
      max: 10,
      prepare: true,
    });
    _trustedDb = drizzle(_trustedClient, { schema });
  }
  return _trustedDb;
}

/**
 * RLS-respecting Drizzle instance (app_user role). Only db/rls-context.ts
 * should call this — everything else should go through
 * withTenantContext() instead of importing it directly.
 */
export function getScopedDb() {
  if (!_scopedDb) {
    _scopedClient ??= postgres(readUrl("DATABASE_URL"), {
      max: 10,
      prepare: true,
    });
    _scopedDb = drizzle(_scopedClient, { schema });
  }
  return _scopedDb;
}

export type Db = ReturnType<typeof getDb>;

export { schema };
