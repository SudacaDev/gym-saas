import { dateOnlyString } from "./format";

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isExpiring: boolean;
}

export const CALENDAR_WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Grilla de semanas completas (lunes a domingo) que cubre el mes de `now`,
 * con los días fuera de mes incluidos para completar la grilla (atenuados
 * en la UI). isExpiring solo marca fechas presentes en expiringDates —
 * hoy esa fecha nunca cae más allá de 7 días porque expiringMembers ya
 * viene acotado a esa ventana desde getDashboardMetrics.
 */
export function buildCalendarWeeks(now: Date, expiringDates: Set<string>): CalendarDay[][] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const todayStr = dateOnlyString(now);

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingDays = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth.getTime() - leadingDays * 24 * 60 * 60 * 1000);
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  const cells: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = dateOnlyString(date);
    cells.push({
      date: dateStr,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      isToday: dateStr === todayStr,
      isExpiring: expiringDates.has(dateStr),
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
