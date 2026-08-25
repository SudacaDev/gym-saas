const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

function randomChar(charset: string): string {
  return charset[Math.floor(Math.random() * charset.length)];
}

/**
 * Generates one candidate short code in the format confirmed with the user
 * (T-20260825-003): 2 letters + 2 digits + 2 letters, e.g. "AB12CD" — a
 * human-friendly visual identifier for front-desk operational use
 * (check-in list, member list/detail), distinct from `member.id` (raw
 * UUID) and from the numeric auto-check-in code (T-20260825-004, a
 * separate field by explicit user decision).
 *
 * NOT guaranteed unique by itself — db/schema/members.ts enforces
 * uniqueness per tenant via `members_tenant_id_short_code_unique`. The
 * caller (app/api/v1/members/route.ts) retries this a few times on a
 * unique-constraint collision. With 26*26*10*10*26*26 ≈ 45.7M
 * combinations per tenant, collisions should be extremely rare in
 * practice — retrying is defensive, not the expected path.
 */
export function generateShortCode(): string {
  return (
    randomChar(LETTERS) +
    randomChar(LETTERS) +
    randomChar(DIGITS) +
    randomChar(DIGITS) +
    randomChar(LETTERS) +
    randomChar(LETTERS)
  );
}
