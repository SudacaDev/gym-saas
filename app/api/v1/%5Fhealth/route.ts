import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withTenantContext } from "@/db/rls-context";
import { getTenantContext } from "@/lib/auth/get-tenant-context";

/**
 * Trivial end-to-end check: resolves the caller's tenant context from the
 * (Supabase-verified) middleware headers, then runs a minimal query inside
 * withTenantContext to prove the whole chain — auth -> tenant resolution
 * -> RLS-scoped DB access — works. Useful once real DATABASE_URL/Supabase
 * credentials exist; until then this will simply fail because there's no
 * signed-in request to reach it with (middleware.ts redirects to
 * /onboarding without a tenant_id/role in app_metadata).
 */
export async function GET() {
  const { tenantId, role } = await getTenantContext();

  await withTenantContext(tenantId, role, async (tx) => {
    // select 1 just proves the transaction + GUCs + RLS plumbing works;
    // no business table needs to exist yet for this to be meaningful.
    await tx.execute(sql`select 1`);
  });

  return NextResponse.json({ ok: true, tenantId });
}
