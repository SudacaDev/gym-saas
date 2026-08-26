import type { Plan } from "@/db/schema/plans";

/** Billing periodicity expressed in whole months, for date-math purposes. */
const PERIOD_MONTHS: Record<Plan["period"], number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Computes a membership's new `endDate` after a `paid` payment is
 * registered against it.
 *
 * Renewal rule: extend from the CURRENT endDate if it's still in the
 * future (so paying early/on-time doesn't discard days already paid for);
 * otherwise extend from `today` (so a membership that lapsed a while ago
 * doesn't silently accrue "phantom" paid time between the old endDate and
 * whenever it actually gets paid again). Same rule applies when there's no
 * endDate yet (a brand-new membership's first payment) — that's treated
 * the same as "already lapsed", so it extends from today.
 *
 * All date math is done on UTC calendar dates (no time-of-day), matching
 * the underlying `date` Postgres columns.
 */
export function computeRenewedEndDate(
  currentEndDate: string | null,
  period: Plan["period"],
  today: Date = new Date(),
): string {
  const todayDateOnly = dateOnly(today);
  const currentEnd = currentEndDate ? parseDateOnly(currentEndDate) : null;
  const base = currentEnd && currentEnd > todayDateOnly ? currentEnd : todayDateOnly;

  return formatDateOnly(addMonths(base, PERIOD_MONTHS[period]));
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
