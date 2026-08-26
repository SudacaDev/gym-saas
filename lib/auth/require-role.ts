import type { BusinessRole, TenantContext } from "./get-tenant-context";

/**
 * Thrown by requireRole when the current user's role isn't in the allowed
 * set. Route handlers should catch this (or let it propagate to a shared
 * error boundary) and respond with HTTP 403.
 */
export class ForbiddenError extends Error {
  readonly status = 403 as const;

  constructor(role: BusinessRole, allowed: readonly BusinessRole[]) {
    super(
      `Role '${role}' is not permitted to perform this action (requires one of: ${allowed.join(", ")}).`,
    );
    this.name = "ForbiddenError";
  }
}

/**
 * Guard for route handlers / server actions: throws ForbiddenError unless
 * `context.role` is one of `allowed`.
 *
 * @example
 * const context = await getTenantContext();
 * requireRole(context, ["owner", "staff"]);
 */
export function requireRole(
  context: Pick<TenantContext, "role">,
  allowed: readonly BusinessRole[],
): void {
  if (!allowed.includes(context.role)) {
    throw new ForbiddenError(context.role, allowed);
  }
}

// TODO(phase-1, business CRUD): adding staff/member users from the owner's
// dashboard (replaces what used to be Clerk's organizationMembership.*
// webhooks) should follow the same pattern as app/onboarding/actions.ts —
// use the Supabase Admin client (lib/supabase/admin.ts, service role key,
// server-only) to create/invite the auth user, insert the corresponding
// `users` row, and set its role. Not implemented yet; out of scope for the
// Clerk -> Supabase Auth migration.
