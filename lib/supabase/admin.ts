import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client authenticated with the SERVICE ROLE key — bypasses RLS
 * entirely and can call the Admin API (`auth.admin.*`, used to write
 * `app_metadata`). NEVER import this from a Client Component or anything
 * that could end up in the browser bundle.
 *
 * The runtime guard below turns an accidental client-side import into an
 * immediate thrown error instead of a silently leaked service-role key.
 *
 * Only used by:
 *  - app/onboarding/actions.ts (bootstrap: create the first Tenant/User
 *    row and stamp app_metadata.tenant_id/role via
 *    auth.admin.updateUserById);
 *  - (later) owner-driven staff/member invites — see the TODO in
 *    lib/auth/require-role.ts.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/supabase/admin.ts must never be imported from client-side code " +
        "— it holds the Supabase service role key.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
