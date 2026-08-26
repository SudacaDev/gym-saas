import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Component / Route Handler / Server Action Supabase client. Reads
 * the session from the incoming request's cookies (already refreshed by
 * middleware.ts) via next/headers' cookies().
 *
 * The `setAll` call below can throw when called from a Server Component
 * (which can only read cookies, not write them) — that's caught and
 * ignored, since middleware.ts is already responsible for refreshing the
 * session cookie on every request, per Supabase's documented App Router
 * pattern.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore, see docstring.
          }
        },
      },
    },
  );
}
