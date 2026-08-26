import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — safe to import from Client Components.
 * Uses the anon key only, so it is fully subject to RLS/Auth rules on the
 * Supabase side; it never has elevated privileges (see lib/supabase/admin.ts
 * for the server-only client that does).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
