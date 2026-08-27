import type { ClassSchedule } from "@/db/schema/class-schedules";

type DayOfWeek = ClassSchedule["dayOfWeek"];

// Same weekday order as features/schedules-page/lib/day-labels.ts's
// DAY_ORDER — duplicated locally rather than imported (no feature in this
// project imports another feature's files, see this file's sibling
// current-class-column.tsx docstring for the full reasoning).
const DAY_ORDER: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Today's DayOfWeek, from `now`'s *local* wall-clock day. JS's
 * `Date#getDay()` is 0=Sunday..6=Saturday; DAY_ORDER starts at Monday, so
 * the mapping is `(getDay() + 6) % 7`.
 */
export function todayDayOfWeek(now: Date): DayOfWeek {
  return DAY_ORDER[(now.getDay() + 6) % 7];
}

/**
 * "YYYY-MM-DD" for `now`'s local calendar date. Deliberately NOT
 * `now.toISOString().slice(0, 10)` (the pattern day-labels.ts's
 * `nextDateForDay` uses) — that converts to UTC first, which would read as
 * tomorrow's date for a good chunk of the evening in Argentina (UTC-3).
 * That's an acceptable quirk for a *recurring weekly slot picker*
 * (day-labels.ts's actual use), but not here: this date directly decides
 * which occurrence row "the class in progress right now" reads/writes to,
 * so it has to match the gym's own wall clock, not UTC's.
 */
export function todayDateString(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentTimeString(now: Date): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * The `class_schedules` slot whose weekday matches today and whose
 * start/end time window contains `now`, if any. `startTime`/`endTime` come
 * back from Postgres as zero-padded "HH:MM:SS" strings, so a lexical
 * comparison against the same format is a valid range check — no need to
 * parse either side into a Date.
 *
 * If more than one schedule matches (two classes overlapping the same
 * slot, a data-entry mistake this app doesn't otherwise prevent), this
 * returns the first match in `schedules`' own order — an explicit,
 * conservative choice, not a real conflict resolution: overlapping
 * schedules aren't a case this task was asked to handle.
 */
export function findCurrentSchedule(
  schedules: ClassSchedule[],
  now: Date,
): ClassSchedule | null {
  const day = todayDayOfWeek(now);
  const time = currentTimeString(now);
  return (
    schedules.find(
      (s) => s.dayOfWeek === day && s.startTime <= time && time <= s.endTime,
    ) ?? null
  );
}
