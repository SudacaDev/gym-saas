"use client";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { useCurrentClass } from "../hooks/useCurrentClass";
import styles from "./current-class-column.module.css";

/**
 * "Clase actual" column (T-20260826-015) — cupo/reservados/lista de espera
 * de la ocurrencia de HOY para la clase en curso ahora mismo (ver
 * ../lib/current-class.ts para cómo se resuelve "actual": día de la semana
 * + franja horaria contra `now`). Reutiliza los mismos endpoints que
 * features/schedules-page/components/class-occurrence-dialog.tsx (no el
 * componente en sí, ver docstring de useCurrentClass.ts), fijos a la
 * fecha/horario de hoy en vez de un selector libre.
 *
 * Sin acción de "agregar reserva" acá a propósito: la tarea solo pidió
 * marcar presente/ausente (la promoción de lista de espera la hace el
 * PATCH atómicamente) — armar reservas nuevas sigue siendo exclusivo de
 * /schedules, esta columna es una vista operativa de "quién está anotado
 * ahora", no un lugar para reservar.
 */
export function CurrentClassColumn() {
  const {
    loading,
    occurrenceLoading,
    error,
    currentSchedule,
    activityName,
    occurrence,
    reserved,
    waitlisted,
    pendingReservationId,
    handleStatusChange,
  } = useCurrentClass();

  return (
    <section className={styles.column} aria-label="Clase actual">
      <h2 className={styles.columnTitle}>Clase actual</h2>

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : !currentSchedule ? (
        <p className={styles.emptyText}>Sin clase en curso.</p>
      ) : (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.activityName}>{activityName}</p>
              <p className={styles.timeRange}>
                {currentSchedule.startTime.slice(0, 5)}–{currentSchedule.endTime.slice(0, 5)}
              </p>
            </div>
            <span className={styles.capacityText}>
              {occurrenceLoading ? "…" : `${reserved.length}/${occurrence?.capacity ?? "∞"}`}
            </span>
          </div>

          {error && (
            <p role="alert" className={styles.errorText}>
              {error}
            </p>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Reservados ({reserved.length})</h3>
            {reserved.length === 0 ? (
              <p className={styles.emptyText}>Nadie reservó todavía.</p>
            ) : (
              <ul className={styles.list}>
                {reserved.map((r) => (
                  <li key={r.id} className={styles.row}>
                    <span className={styles.name}>
                      {r.firstName} {r.lastName}
                    </span>
                    <div className={styles.rowActions}>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={pendingReservationId === r.id}
                        onClick={() => handleStatusChange(r, "attended")}
                      >
                        Presente
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={pendingReservationId === r.id}
                        onClick={() => handleStatusChange(r, "absent")}
                      >
                        Ausente
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Lista de espera ({waitlisted.length})</h3>
            {waitlisted.length === 0 ? (
              <p className={styles.emptyText}>Sin lista de espera.</p>
            ) : (
              <ul className={styles.list}>
                {waitlisted.map((r) => (
                  <li key={r.id} className={styles.row}>
                    <span className={styles.name}>
                      {r.firstName} {r.lastName}
                    </span>
                    <StatusPill tone="alert">En espera</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
