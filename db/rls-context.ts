import { sql } from "drizzle-orm";
import { getScopedDb, type Db } from "./client";

export type TenantRole = "owner" | "staff" | "member";

/**
 * The ONLY sanctioned way to run a query against tenant-scoped tables.
 *
 * Opens a Postgres transaction, sets the session-local GUCs that the RLS
 * policies in db/policies/0002_tenant_isolation_policies.sql key off of
 * (`app.current_tenant_id`, `app.current_role`), runs `fn` with that
 * transaction's Drizzle handle, and commits. Any error thrown inside `fn`
 * — or by the query itself — rolls the whole transaction back, so no
 * partial write and no leaked GUC state can ever survive it.
 *
 * `set_config(..., true)` sets the value only for the current transaction
 * (the `true` third arg = "local"), so there is no risk of it leaking
 * into a pooled connection's next, unrelated transaction — the GUC is
 * reset the instant this transaction ends, success or failure.
 *
 * Because every GUC is applied via a bound parameter (never string
 * interpolation), a malicious or malformed tenantId can't be used to
 * inject SQL into the `set_config` call itself.
 */
export async function withTenantContext<T>(
  tenantId: string,
  role: TenantRole,
  fn: (tx: Db) => Promise<T>,
): Promise<T> {
  if (!tenantId) {
    throw new Error("withTenantContext: tenantId is required");
  }

  const db = getScopedDb();

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_tenant_id', ${tenantId}, true)`,
    );
    await tx.execute(
      sql`select set_config('app.current_role', ${role}, true)`,
    );

    // tx has the same query surface as Db, cast so callers get the same
    // fully-typed schema-aware handle regardless of which one they get.
    return fn(tx as unknown as Db);
  });
}
