"use client";

import { Fragment } from "react";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import { ClassOccurrenceDialog } from "./class-occurrence-dialog";
import type { ScheduleViewProps } from "./schedule-view-props";
import { DAY_ORDER, DAY_LABELS_SHORT } from "../lib/day-labels";
import styles from "../index.module.css";

/**
 * Empty-slot prefill (T-20260825-007): no fixed-duration model exists per
 * row (rows are hour-aligned synthetic slots, see T-20260825-009), so the
 * end time is a plain +1h default the dialog still leaves fully editable —
 * own call, not something the user was asked to confirm.
 */
function addOneHour(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const nextHours = (hours + 1) % 24;
  return `${String(nextHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Parses a `class_schedules.start_time`/`end_time` string ("HH:MM:SS" as
 * returned by Postgres' `time` column via drizzle, though this also
 * tolerates a plain "HH:MM") into minutes since midnight — used to derive
 * the hour-aligned row range (T-20260825-009).
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * The original "Horarios" view (T-20260821-004) — a 7-column weekly grid
 * (day × hour rows). Extracted as-is out of the page component so it can be
 * one of three selectable views instead of the only one (T-20260825-006);
 * look/behavior unchanged, including full inline edit/delete per slot.
 *
 * Empty cells are clickable (T-20260825-007): they open ScheduleFormDialog
 * in create mode with that cell's day/time already loaded, instead of a
 * blank div — same dialog the "Nuevo horario" button and edit use, so
 * there's no second code path for creating a slot.
 *
 * Rows are hour-aligned synthetic slots (T-20260825-009), not just the
 * exact `startTime`s in use: generated from the earliest `startTime` to
 * the latest `endTime` across ALL loaded `schedules` (single range for the
 * whole week, not per-day), stepping by a fixed 1 hour, filling in gaps as
 * empty-but-clickable rows. Caller guarantees `schedules.length > 0`
 * whenever this renders (`index.tsx` gates the empty case before this
 * component is mounted) — see the gate file for why this is safe to
 * assume rather than defended against here.
 */
export function ScheduleTableView({
  schedules,
  activities,
  instructors,
  selfInstructor,
  activityNameById,
  onSaved,
  onRemoved,
  onActivityCreated,
  onDelete,
  deletingId,
}: ScheduleViewProps) {
  const minStartMinutes = schedules.reduce(
    (min, s) => Math.min(min, timeToMinutes(s.startTime)),
    Infinity,
  );
  const maxEndMinutes = schedules.reduce(
    (max, s) => Math.max(max, timeToMinutes(s.endTime)),
    -Infinity,
  );

  const firstHour = Math.floor(minStartMinutes / 60);
  // Upper bound is exclusive of the exact hour the latest class ends on:
  // if the latest end time lands precisely on an hour boundary (e.g. a
  // class 08:00-09:00), don't render a trailing empty 09:00 row with
  // nothing before it to spill into it. If it ends mid-hour (e.g.
  // 08:00-09:30), that hour genuinely overlaps a real class, so it's kept.
  // See the T-20260825-009 gate for the write-up of this call.
  const lastHour = Math.max(
    firstHour,
    maxEndMinutes % 60 === 0 ? maxEndMinutes / 60 - 1 : Math.floor(maxEndMinutes / 60),
  );

  const timeRows: number[] = [];
  for (let hour = firstHour; hour <= lastHour; hour++) {
    timeRows.push(hour);
  }

  return (
    <div className={styles.weekWrap}>
      <div className={styles.week}>
        <div className={styles.cornerCell} />
        {DAY_ORDER.map((day) => (
          <div key={day} className={styles.dayHeader}>
            {DAY_LABELS_SHORT[day]}
          </div>
        ))}

        {timeRows.map((hour) => {
          const time = hourLabel(hour);
          return (
            <Fragment key={time}>
              <div className={styles.timeLabel}>{time}</div>
              {DAY_ORDER.map((day) => {
                // Bucket by hour, not exact `startTime` equality: rows are now
                // synthetic hour-aligned slots (T-20260825-009), and the
                // native `<input type="time">` in ScheduleFormDialog has no
                // step restriction, so a real schedule can start mid-hour
                // (e.g. "18:30"). Matching by hour keeps it visible in its
                // row instead of silently disappearing because no generated
                // row's label equals its exact startTime string anymore.
                const cellSchedules = schedules.filter(
                  (s) =>
                    s.dayOfWeek === day &&
                    Math.floor(timeToMinutes(s.startTime) / 60) === hour,
                );

                if (cellSchedules.length === 0) {
                  return (
                    <div key={day} className={styles.cell}>
                      <ScheduleFormDialog
                        activities={activities}
                        instructors={instructors}
                        selfInstructor={selfInstructor}
                        initialValues={{
                          dayOfWeek: day,
                          startTime: time,
                          endTime: addOneHour(time),
                        }}
                        trigger={
                          <button
                            type="button"
                            className={styles.cellEmpty}
                            aria-label={`Agregar horario: ${DAY_LABELS_SHORT[day]} ${time}`}
                          >
                            <PlusIcon className={styles.cellEmptyIcon} />
                          </button>
                        }
                        onSaved={onSaved}
                        onActivityCreated={onActivityCreated}
                      />
                    </div>
                  );
                }

                return (
                  <div key={day} className={styles.cell}>
                    {cellSchedules.map((schedule) => (
                      <div key={schedule.id} className={styles.slot}>
                        <span className={styles.slotTime}>
                          {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}
                        </span>
                        <span className={styles.slotActivity}>
                          {activityNameById.get(schedule.activityId) ?? "—"}
                        </span>
                        <div className={styles.slotActions}>
                          <ClassOccurrenceDialog
                            schedule={schedule}
                            activityName={activityNameById.get(schedule.activityId) ?? "—"}
                            trigger={
                              <button
                                type="button"
                                className={cn(styles.slotAction, styles.slotActionEdit)}
                              >
                                Reservas
                              </button>
                            }
                          />

                          <div className={styles.slotActionsGroup}>
                            <ScheduleFormDialog
                              schedule={schedule}
                              activities={activities}
                              instructors={instructors}
                              selfInstructor={selfInstructor}
                              trigger={
                                <button
                                  type="button"
                                  className={cn(styles.slotAction, styles.slotActionEdit)}
                                  aria-label="Editar horario"
                                >
                                  <PencilIcon className={styles.slotActionIcon} />
                                </button>
                              }
                              onSaved={onSaved}
                              onRemoved={onRemoved}
                              onActivityCreated={onActivityCreated}
                            />
                            <button
                              type="button"
                              disabled={deletingId === schedule.id}
                              className={cn(styles.slotAction, styles.slotActionDelete)}
                              aria-label="Borrar horario"
                              onClick={() => onDelete(schedule)}
                            >
                              {deletingId === schedule.id ? (
                                <Loader2Icon className={cn(styles.slotActionIcon, "animate-spin")} />
                              ) : (
                                <Trash2Icon className={styles.slotActionIcon} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
