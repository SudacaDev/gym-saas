import type { ClassSchedule } from "@/db/schema/class-schedules";

type DayOfWeek = ClassSchedule["dayOfWeek"];

export const DAY_ORDER: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export const DAY_LABELS_SHORT: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

// JS's Date#getDay() index (0 = Sunday) for each DayOfWeek — used to find
// the next real calendar date a recurring slot falls on (T-20260826-011,
// class occurrences need an actual date, the slot itself only has a
// weekday).
const DAY_JS_INDEX: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** "YYYY-MM-DD" for the next date `day` falls on, including today if it matches. */
export function nextDateForDay(day: DayOfWeek, from = new Date()): string {
  const target = DAY_JS_INDEX[day];
  const date = new Date(from);
  const diff = (target - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
