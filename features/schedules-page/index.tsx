"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./components/schedule-form-dialog";
import { ScheduleTableView } from "./components/schedule-table-view";
import { ScheduleKanbanView } from "./components/schedule-kanban-view";
import { ScheduleCalendarView } from "./components/schedule-calendar-view";
import { useSchedules } from "./use-schedules";
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
  const {
    schedules,
    activities,
    loading,
    error,
    activityNameById,
    handleActivityCreated,
    handleSaved,
    handleRemoved,
    handleDelete,
  } = useSchedules();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Horarios</h1>
        <ScheduleFormDialog
          trigger={<Button>Nuevo horario</Button>}
          activities={activities}
          onSaved={handleSaved}
          onActivityCreated={handleActivityCreated}
        />
      </div>

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

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : schedules.length === 0 ? (
        <p className={styles.emptyText}>Todavía no cargaste horarios.</p>
      ) : view === "tabla" ? (
        <ScheduleTableView
          schedules={schedules}
          activities={activities}
          activityNameById={activityNameById}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onActivityCreated={handleActivityCreated}
          onDelete={handleDelete}
        />
      ) : view === "kanban" ? (
        <ScheduleKanbanView
          schedules={schedules}
          activities={activities}
          activityNameById={activityNameById}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onActivityCreated={handleActivityCreated}
          onDelete={handleDelete}
        />
      ) : (
        <ScheduleCalendarView
          schedules={schedules}
          activities={activities}
          activityNameById={activityNameById}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onActivityCreated={handleActivityCreated}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
