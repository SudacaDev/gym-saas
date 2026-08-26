/**
 * How many days before a membership's endDate the automatic reminder fires
 * — confirmed with the user 2026-08-24 (T-20260824-003). A single
 * app-wide constant for v1; not configurable per tenant yet.
 */
export const REMINDER_DAYS_BEFORE = 3;

/**
 * True when `now`'s calendar date is exactly `daysBefore` days before
 * `endDate` — the one day per membership the automatic cron should fire
 * for it, not a "within N days" range (that would re-select the same
 * membership on every run between now and its due date; the unique index
 * on email_send_log already guards against a double-send, but there's no
 * reason to even attempt it more than once).
 *
 * Same UTC-calendar-day comparison as lib/memberships/status.ts's
 * hasPassed(), for the same reason: `endDate` is a DATE column with no
 * time component, so it has to be compared as a calendar day, not an
 * instant the server's local timezone could shift.
 */
export function isDueForReminder(
  endDate: string,
  now: Date = new Date(),
  daysBefore: number = REMINDER_DAYS_BEFORE,
): boolean {
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const diffDays = Math.round((end - today) / (24 * 60 * 60 * 1000));
  return diffDays === daysBefore;
}
