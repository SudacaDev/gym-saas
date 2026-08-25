/**
 * Minimal in-memory, fixed-window rate limiter — built for
 * T-20260825-004's self-service check-in code (POST
 * /api/v1/checkins/self), which needs *some* brute-force protection
 * against its small 10^6-combination code space (see
 * lib/members/generate-checkin-code.ts) and this project has no existing
 * rate-limiting utility/dependency to reach for instead.
 *
 * How it's used here: only *failed* code lookups ("wrong code") consume
 * budget (see the route handler) — a legitimate member typing their own
 * correct code never counts against the limit, no matter how many
 * different members check in back-to-back at a busy front desk.
 *
 * ## Known limitations — read before reusing this elsewhere
 *
 * - **In-memory only.** State lives in a module-level `Map` in whatever
 *   process is running. This project's `vercel.json` only declares a cron
 *   job today, no explicit Node runtime/instance pinning — meaning this
 *   route is a standard Vercel serverless function, which can and will
 *   run as multiple concurrent instances under load, and *will* cold-start
 *   fresh (losing all counters) on scale-to-zero. In that world this
 *   limiter is closer to "best-effort speed bump" than a hard guarantee:
 *   an attacker hitting multiple warm instances in parallel effectively
 *   gets `max` attempts *per instance*, not globally. It's still strictly
 *   better than no limit at all (raises the cost of a brute-force sweep
 *   non-trivially, and fully protects the common single-warm-instance
 *   case this app runs today), but if this app moves to sustained high
 *   traffic across many concurrent instances, this needs to move to a
 *   shared store (e.g. a `rate_limits` Postgres table with an atomic
 *   `UPDATE ... RETURNING`, or Redis/Upstash) instead of module memory.
 * - **Fixed window, not sliding.** A key can see up to ~2x `max` attempts
 *   if they're spread across a window boundary (e.g. `max` right before
 *   a reset, `max` again right after). Accepted here for simplicity —
 *   the goal is raising the cost of guessing, not a precise SLA.
 * - **Unbounded map growth.** Entries are never proactively evicted, only
 *   overwritten when their window has expired and that same key is hit
 *   again. An attacker rotating through many distinct keys (e.g. spoofed
 *   IPs, if this were ever keyed by IP) could grow the map indefinitely
 *   until the process recycles. Not a practical concern for this route's
 *   actual key (tenant + authenticated staff session, see the route
 *   handler) since the key space is bounded by real staff accounts, but
 *   worth flagging before reusing this for a public-facing endpoint.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Max attempts allowed within one window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitStatus {
  limited: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

/**
 * Reports whether `key` is currently over budget — does NOT consume an
 * attempt by itself. Call this first and bail out (429) before doing any
 * real work; call `recordAttempt` separately only for the specific
 * outcome that should count against the budget (see the route handler).
 */
export function checkRateLimit(
  key: string,
  { max, windowMs }: RateLimitOptions,
): RateLimitStatus {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    return { limited: false, remaining: max, resetAt: now + windowMs };
  }

  return {
    limited: entry.count >= max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetAt,
  };
}

/** Consumes one attempt for `key`, starting a fresh window if needed. */
export function recordAttempt(key: string, options: RateLimitOptions): void {
  const { windowMs } = options;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
}
