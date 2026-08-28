"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import type { ScheduleViewProps } from "./schedule-view-props";
import styles from "./schedule-calendar-view.module.css";

type DayOfWeek = ClassSchedule["dayOfWeek"];

// Index = Date#getUTCDay() (0 = Sunday ... 6 = Saturday).
const WEEKDAY_BY_INDEX: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const WEEKDAY_HEADER_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const monthYearFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  weekday: DayOfWeek;
}

/**
 * Full-weeks grid (Monday...Sunday) covering the given month, with
 * leading/trailing days from adjacent months included to complete the
 * grid (rendered muted) — same shape as the dashboard's vencimientos
 * calendar (features/dashboard-page/index.tsx#buildCalendarWeeks), adapted
 * here to also carry each cell's ISO weekday so callers can match it
 * against `class_schedules.dayOfWeek`.
 */
function buildCalendarWeeks(year: number, month: number, todayStr: string): CalendarDay[][] {
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
      weekday: WEEKDAY_BY_INDEX[date.getUTCDay()],
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Monthly calendar view, Google-Calendar-style. `class_schedules` rows are
 * a weekly recurrence (dayOfWeek, no specific date — see
 * db/schema/class-schedules.ts), so a class is shown on *every* calendar
 * day in the visible month matching its dayOfWeek, identically each time —
 * there's no startDate/endDate/exception model in the schema, so a
 * "skip this one occurrence" feature is deliberately out of scope
 * (T-20260825-006). Editing is a small, natural extension: clicking a
 * class chip opens the same ScheduleFormDialog table/kanban use; there's
 * no delete affordance directly on the compact calendar chip (unticking
 * the day inside the edit dialog covers deletion) to keep day cells from
 * getting cramped.
 */
export function ScheduleCalendarView({
  schedules,
  activities,
  instructors,
  selfInstructor,
  activityNameById,
  onSaved,
  onRemoved,
  onActivityCreated,
}: ScheduleViewProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  });

  const todayStr = dateOnlyString(today);
  const weeks = useMemo(
    () => buildCalendarWeeks(cursor.year, cursor.month, todayStr),
    [cursor, todayStr],
  );
  const monthLabel = monthYearFormatter.format(new Date(Date.UTC(cursor.year, cursor.month, 1)));

  const schedulesByDay = useMemo(() => {
    const map = new Map<DayOfWeek, ClassSchedule[]>();
    for (const schedule of schedules) {
      const list = map.get(schedule.dayOfWeek) ?? [];
      list.push(schedule);
      map.set(schedule.dayOfWeek, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [schedules]);

  function goToPrevMonth() {
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }

  function goToNextMonth() {
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.nav}>
        <p className={styles.navLabel}>{monthLabel}</p>
        <div className={styles.navButtons}>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={goToPrevMonth}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Mes siguiente"
            onClick={goToNextMonth}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {WEEKDAY_HEADER_LABELS.map((label) => (
          <div key={label} className={styles.weekday}>
            {label}
          </div>
        ))}

        {weeks.flat().map((cell) => {
          const daySchedules = schedulesByDay.get(cell.weekday) ?? [];
          return (
            <div
              key={cell.date}
              className={cn(styles.day, !cell.inMonth && styles.dayMuted)}
            >
              <span
                className={cn(
                  styles.dayNumber,
                  !cell.inMonth && styles.dayNumberMuted,
                  cell.isToday && styles.dayNumberToday,
                )}
              >
                {cell.day}
              </span>
              {daySchedules.map((schedule) => (
                <ScheduleFormDialog
                  key={schedule.id}
                  schedule={schedule}
                  activities={activities}
                  instructors={instructors}
                  selfInstructor={selfInstructor}
                  trigger={
                    <button type="button" className={styles.chip}>
                      <span className={styles.chipTime}>
                        {schedule.startTime.slice(0, 5)}
                      </span>{" "}
                      {activityNameById.get(schedule.activityId) ?? "—"}
                    </button>
                  }
                  onSaved={onSaved}
                  onRemoved={onRemoved}
                  onActivityCreated={onActivityCreated}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
