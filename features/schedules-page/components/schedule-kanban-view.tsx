"use client";

import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import type { ScheduleViewProps } from "./schedule-view-props";
import { DAY_ORDER, DAY_LABELS } from "../lib/day-labels";
import indexStyles from "../index.module.css";
import styles from "./schedule-kanban-view.module.css";

/**
 * Kanban view: one column per day of the week (Monday...Sunday, via
 * DAY_ORDER/DAY_LABELS), each day's classes as cards sorted by start time.
 * Same underlying `schedules`/`activities` as the table view — no separate
 * fetch (T-20260825-006). Cards reuse the table view's `.slot`/`.slotActions`
 * classes (from ../index.module.css) so Editar/Borrar keep the exact same
 * visual language and full CRUD parity, rather than making the whole card
 * a single click-to-edit trigger (which would've meant nesting an
 * interactive "borrar" button inside the trigger button — an a11y smell).
 */
export function ScheduleKanbanView({
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
  return (
    <div className={styles.board}>
      {DAY_ORDER.map((day) => {
        const daySchedules = schedules
          .filter((s) => s.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <div key={day} className={styles.column}>
            <div className={styles.columnHeader}>{DAY_LABELS[day]}</div>
            {daySchedules.length === 0 ? (
              <p className={styles.columnEmpty}>—</p>
            ) : (
              daySchedules.map((schedule) => (
                <div key={schedule.id} className={indexStyles.slot}>
                  <span className={indexStyles.slotTime}>
                    {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}
                  </span>
                  <span className={indexStyles.slotActivity}>
                    {activityNameById.get(schedule.activityId) ?? "—"}
                  </span>
                  <div className={indexStyles.slotActions}>
                    <ScheduleFormDialog
                      schedule={schedule}
                      activities={activities}
                      instructors={instructors}
                      selfInstructor={selfInstructor}
                      trigger={
                        <button
                          type="button"
                          className={cn(indexStyles.slotAction, indexStyles.slotActionEdit)}
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
                      disabled={deletingId === schedule.id}
                      className={cn(indexStyles.slotAction, indexStyles.slotActionDelete)}
                      onClick={() => onDelete(schedule)}
                    >
                      {deletingId === schedule.id ? "Borrando..." : "Borrar"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
