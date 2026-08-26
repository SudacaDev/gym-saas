import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/" is the public marketing landing page (features/home-page) — it must
// stay public so a signed-out visitor can actually see it instead of being
// bounced to /sign-in before ever landing on the site.
const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/onboarding"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// NOTE: /api/v1/_health is intentionally NOT public — task spec calls it
// a "protected" endpoint: it must go through the same auth/tenant
// resolution as any other API route so it can prove that chain works.

const BUSINESS_ROLES = ["owner", "staff", "member"] as const;
type BusinessRole = (typeof BUSINESS_ROLES)[number];

/**
 * Shape of the fields we read off the authenticated user's app_metadata.
 * Unlike user_metadata, app_metadata can only be written server-side with
 * the service role key (see lib/supabase/admin.ts — used by
 * app/onboarding/actions.ts) so it's the trusted source for tenant_id and
 * role, equivalent to the custom JWT template claim this project used to
 * configure in the Clerk Dashboard.
 */
interface AppMetadata {
  tenant_id?: string;
  role?: string;
}

function toBusinessRole(role: string | undefined): BusinessRole | null {
  return role && (BUSINESS_ROLES as readonly string[]).includes(role)
    ? (role as BusinessRole)
    : null;
}

export default async function middleware(request: NextRequest) {
  // Collected from Supabase's cookie refresh (setAll below) and replayed
  // onto whichever NextResponse we end up returning, so a refreshed
  // session survives every branch (redirect or next()) below.
  const refreshedCookies: {
    name: string;
    value: string;
    options?: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          refreshedCookies.push(...cookiesToSet);
        },
      },
    },
  );

  function finish(response: NextResponse): NextResponse {
    refreshedCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  }

  // IMPORTANT: always use getUser(), never getSession(), in server code —
  // getSession() trusts the (client-forgeable) cookie payload as-is, while
  // getUser() revalidates it against Supabase's auth server on every call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicRoute(request.nextUrl.pathname)) {
    return finish(NextResponse.next());
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return finish(NextResponse.redirect(url));
  }

  const appMetadata = (user.app_metadata ?? {}) as AppMetadata;
  const tenantId = appMetadata.tenant_id ?? null;
  const role = toBusinessRole(appMetadata.role);

  if (!tenantId || !role) {
    // Signed in, but app_metadata isn't populated yet (bootstrap not done)
    // — treat as not-yet-onboarded rather than letting the request
    // through with a partial/guessed tenant context.
    return finish(NextResponse.redirect(new URL("/onboarding", request.url)));
  }

  // Verification already happened inside getUser() above (Supabase
  // validated the request's JWT against its auth server). Only now do we
  // set the internal trust headers — and we explicitly strip any
  // client-supplied values for them first, so a caller can never spoof
  // its own tenant/role by sending these headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-tenant-id");
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-id");
  requestHeaders.set("x-tenant-id", tenantId);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-id", user.id);

  return finish(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
  );
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
