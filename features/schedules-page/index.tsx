"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./components/schedule-form-dialog";
import { ScheduleTableView } from "./components/schedule-table-view";
import { ScheduleKanbanView } from "./components/schedule-kanban-view";
import { ScheduleCalendarView } from "./components/schedule-calendar-view";
import { ScheduleTableSkeleton } from "./components/schedule-table-skeleton";
import { useSchedules } from "./hooks/useSchedules";
import { useOwnStaffMember } from "./hooks/useOwnStaffMember";
import styles from "./index.module.css";

type ScheduleView = "tabla" | "kanban" | "calendario";

// Default is "tabla" — own call (not explicitly asked by the user), the
// safer non-regressive default since it's the view that already existed
// before the other two were added (T-20260825-006, see gate file).
const DEFAULT_VIEW: ScheduleView = "tabla";

const VIEW_OPTIONS: { value: ScheduleView; label: string }[] = [
  { value: "tabla", label: "Tabla" },
  { value: "kanban", label: "Kanban" },
  { value: "calendario", label: "Calendario" },
];

export function SchedulesPage() {
  const [view, setView] = useState<ScheduleView>(DEFAULT_VIEW);
  const [onlyMine, setOnlyMine] = useState(false);
  const {
    schedules,
    activities,
    instructors,
    loading,
    error,
    activityNameById,
    handleActivityCreated,
    handleSaved,
    handleRemoved,
    handleDelete,
    deletingId,
  } = useSchedules();
  const { ownStaffMember } = useOwnStaffMember();

  // Present only for a profesor viewing their own instance of this page —
  // the API self-assigns their writes either way (see
  // lib/schedules/resolve-instructor-id.ts), this just tells the form to
  // show that as a static note instead of a picker they could misleadingly
  // "change" (T-20260827-007). Memoized (not a plain conditional) so it's a
  // stable reference across renders — otherwise a new object every render
  // would defeat visibleSchedules' own memoization below.
  const selfInstructor = useMemo(
    () =>
      ownStaffMember?.staffCategory === "instructor"
        ? {
            id: ownStaffMember.id,
            name: [ownStaffMember.firstName, ownStaffMember.lastName].filter(Boolean).join(" "),
          }
        : undefined,
    [ownStaffMember],
  );

  const visibleSchedules = useMemo(() => {
    if (!onlyMine || !selfInstructor) return schedules;
    return schedules.filter((s) => s.instructorId === selfInstructor.id);
  }, [schedules, onlyMine, selfInstructor]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Horarios</h1>
        <ScheduleFormDialog
          trigger={<Button>Nuevo horario</Button>}
          activities={activities}
          instructors={instructors}
          selfInstructor={selfInstructor}
          onSaved={handleSaved}
          onActivityCreated={handleActivityCreated}
        />
      </div>

      <div className={styles.controlsRow}>
        <div role="tablist" aria-label="Vista de horarios" className={styles.viewSwitcher}>
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              className={cn(styles.viewTab, view === option.value && styles.viewTabActive)}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {selfInstructor && (
          <button
            type="button"
            aria-pressed={onlyMine}
            className={cn(styles.myClassesToggle, onlyMine && styles.myClassesToggleActive)}
            onClick={() => setOnlyMine((prev) => !prev)}
          >
            Mis clases
          </button>
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <ScheduleTableSkeleton />
      ) : visibleSchedules.length === 0 ? (
        <p className={styles.emptyText}>
          {onlyMine ? "No tenés clases asignadas." : "Todavía no cargaste horarios."}
        </p>
      ) : view === "tabla" ? (
        <ScheduleTableView
          schedules={visibleSchedules}
          activities={activities}
          instructors={instructors}
          selfInstructor={selfInstructor}
          activityNameById={activityNameById}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onActivityCreated={handleActivityCreated}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      ) : view === "kanban" ? (
        <ScheduleKanbanView
          schedules={visibleSchedules}
          activities={activities}
          instructors={instructors}
          selfInstructor={selfInstructor}
          activityNameById={activityNameById}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onActivityCreated={handleActivityCreated}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      ) : (
        <ScheduleCalendarView
          schedules={visibleSchedules}
          activities={activities}
          instructors={instructors}
          selfInstructor={selfInstructor}
          activityNameById={activityNameById}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onActivityCreated={handleActivityCreated}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}
    </div>
  );
}
