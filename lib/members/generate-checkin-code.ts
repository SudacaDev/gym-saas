function randomDigit(): string {
  return String(Math.floor(Math.random() * 10));
}

/**
 * Generates one candidate 6-digit numeric code for self-service
 * auto-check-in (T-20260825-004), e.g. "042917" — what a member types
 * into the numeric pad on the existing authenticated check-in screen to
 * identify themselves, distinct from `generateShortCode()`'s 2-letter+
 * 2-digit+2-letter visual ID (T-20260825-003, a separate field by
 * explicit user decision, not unified with this one).
 *
 * NOT guaranteed unique by itself — db/schema/members.ts enforces
 * uniqueness per tenant via `members_tenant_id_checkin_code_unique`. The
 * caller (app/api/v1/members/route.ts) retries this a few times on a
 * unique-constraint collision, same pattern as generate-short-code.ts.
 *
 * Only 10^6 = 1,000,000 combinations per tenant — far smaller than
 * shortCode's ~45.7M, since this needs to stay quick to type on a numeric
 * pad. That smaller space is exactly why the resolving endpoint (POST
 * /api/v1/checkins/self) enforces rate limiting on wrong codes — see
 * lib/rate-limit/fixed-window-limiter.ts.
 *
 * Returned as a string (not a number) so leading zeros round-trip
 * exactly — "007123" is a valid, distinct code from "7123".
 */
export function generateCheckinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += randomDigit();
  }
  return code;
}
