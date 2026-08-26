import { headers } from "next/headers";

export const BUSINESS_ROLES = ["owner", "staff", "member"] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export interface TenantContext {
  tenantId: string;
  role: BusinessRole;
  userId: string;
}

/**
 * Server-side read of the trust headers middleware.ts set after verifying
 * the request's Supabase Auth JWT (x-tenant-id / x-user-role / x-user-id). Route
 * handlers and Server Components should call this instead of touching
 * headers()/auth() directly, so there's exactly one place that knows the
 * header names and validates their shape.
 *
 * Throws if the headers are missing/invalid — which only happens if a
 * route bypasses middleware.ts (e.g. it's not covered by its matcher) or
 * is called outside a request (e.g. a script). Callers that legitimately
 * need to handle "no tenant" (like the onboarding flow) should catch this
 * rather than expecting a null-ish return, since a route reached through
 * middleware.ts is guaranteed to either have full context or have already
 * been redirected to /onboarding.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const headerList = await headers();

  const tenantId = headerList.get("x-tenant-id");
  const role = headerList.get("x-user-role");
  const userId = headerList.get("x-user-id");

  if (!tenantId || !role || !userId) {
    throw new Error(
      "getTenantContext: missing x-tenant-id/x-user-role/x-user-id headers. " +
        "This route is either not covered by middleware.ts's matcher, or " +
        "was called outside of a request lifecycle.",
    );
  }

  if (!(BUSINESS_ROLES as readonly string[]).includes(role)) {
    throw new Error(`getTenantContext: invalid x-user-role header '${role}'`);
  }

  return { tenantId, role: role as BusinessRole, userId };
}
