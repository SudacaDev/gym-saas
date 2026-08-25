"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import type { ScheduleViewProps } from "./schedule-view-props";
import { DAY_ORDER, DAY_LABELS_SHORT } from "../day-labels";
import styles from "../index.module.css";

/**
 * The original "Horarios" view (T-20260821-004) — a 7-column weekly grid
 * (day × hour rows). Extracted as-is out of the page component so it can be
 * one of three selectable views instead of the only one (T-20260825-006);
 * look/behavior unchanged, including full inline edit/delete per slot.
 */
export function ScheduleTableView({
  schedules,
  activities,
  activityNameById,
  onSaved,
  onRemoved,
  onActivityCreated,
  onDelete,
}: ScheduleViewProps) {
  const timeRows = Array.from(new Set(schedules.map((s) => s.startTime))).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className={styles.weekWrap}>
      <div className={styles.week}>
        <div className={styles.cornerCell} />
        {DAY_ORDER.map((day) => (
          <div key={day} className={styles.dayHeader}>
            {DAY_LABELS_SHORT[day]}
          </div>
        ))}

        {timeRows.map((time) => (
          <Fragment key={time}>
            <div className={styles.timeLabel}>{time.slice(0, 5)}</div>
            {DAY_ORDER.map((day) => {
              const cellSchedules = schedules.filter(
                (s) => s.dayOfWeek === day && s.startTime === time,
              );

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
                        <ScheduleFormDialog
                          schedule={schedule}
                          activities={activities}
                          trigger={
                            <button
                              type="button"
                              className={cn(styles.slotAction, styles.slotActionEdit)}
                            >
                              Editar
                            </button>
                          }
                          onSaved={onSaved}
                          onRemoved={onRemoved}
                          onActivityCreated={onActivityCreated}
                        />
                        <button
                          type="button"
                          className={cn(styles.slotAction, styles.slotActionDelete)}
                          onClick={() => onDelete(schedule)}
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
