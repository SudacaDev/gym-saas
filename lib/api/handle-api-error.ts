import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/auth/require-role";

/**
 * Shared unknown-error -> HTTP response mapping for app/api/v1/** route
 * handlers. Zod validation failures are handled inline by each handler
 * (400, before any DB access is attempted) since the response shape
 * differs per schema; this only covers the cross-cutting errors that can
 * come out of getTenantContext()/requireRole()/withTenantContext() itself.
 * Route-specific DB errors (e.g. the FK violation on deleting a plan with
 * memberships) are handled by the route that can give them a meaningful
 * message, before falling back to this.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function hasSqlState(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * True for a Postgres foreign-key violation (SQLSTATE 23503) — e.g.
 * deleting a `plans` row that a `memberships` row still references via
 * `onDelete: "restrict"`.
 *
 * drizzle-orm wraps the driver's error in a DrizzleQueryError; the actual
 * PostgresError (which carries the SQLSTATE `code`) is its `.cause`, not a
 * top-level property — so this checks both, cause first.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;

  return hasSqlState(cause, "23503") || hasSqlState(error, "23503");
}

/**
 * True for a Postgres unique-constraint violation (SQLSTATE 23505) —
 * e.g. a generated member short code colliding with one that already
 * exists for that tenant (`members_tenant_id_short_code_unique`, see
 * app/api/v1/members/route.ts). Same cause-unwrapping shape as
 * isForeignKeyViolation above, since postgres.js's error is wrapped the
 * same way regardless of which SQLSTATE it carries.
 *
 * `constraintName` is optional and, when passed, narrows the check to
 * that specific constraint (via the driver's `constraint_name` field) —
 * useful when a table has more than one unique constraint and only one of
 * them should trigger a retry instead of bubbling up as a real error.
 */
export function isUniqueViolation(
  error: unknown,
  constraintName?: string,
): boolean {
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;

  const target = hasSqlState(cause, "23505")
    ? cause
    : hasSqlState(error, "23505")
      ? error
      : undefined;

  if (!target) return false;
  if (!constraintName) return true;

  return (
    typeof target === "object" &&
    target !== null &&
    "constraint_name" in target &&
    (target as { constraint_name?: unknown }).constraint_name === constraintName
  );
}
