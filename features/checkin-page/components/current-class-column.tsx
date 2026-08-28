"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill, type StatusPillTone } from "@/components/status-pill";
import { useCurrentClass, type ReservationStatus } from "../hooks/useCurrentClass";
import { CurrentClassSkeleton } from "./current-class-skeleton";
import styles from "./current-class-column.module.css";

// Same mapping as features/schedules-page/components/class-occurrence-dialog.tsx
// — duplicated, not imported (this project's features don't import each
// other's files, see useCurrentClass.ts's docstring).
const STATUS_LABELS: Record<ReservationStatus, string> = {
  reserved: "Reservado",
  waitlisted: "En espera",
  attended: "Presente",
  absent: "Ausente",
  cancelled: "Cancelado",
};

const STATUS_TONES: Record<ReservationStatus, StatusPillTone> = {
  reserved: "info",
  waitlisted: "alert",
  attended: "success",
  absent: "danger",
  cancelled: "neutral",
};

/**
 * "Clase actual" column (T-20260826-015) — cupo/reservados/lista de espera
 * de la ocurrencia de HOY para la clase en curso ahora mismo (ver
 * ../lib/current-class.ts para cómo se resuelve "actual": día de la semana
 * + franja horaria contra `now`). Reutiliza los mismos endpoints que
 * features/schedules-page/components/class-occurrence-dialog.tsx (no el
 * componente en sí, ver docstring de useCurrentClass.ts), fijos a la
 * fecha/horario de hoy en vez de un selector libre.
 *
 * También permite agregar una reserva nueva directo desde acá (a pedido
 * explícito del usuario, 2026-08-27 — "modo rápido para todo"), mismo
 * patrón de búsqueda de socio que class-occurrence-dialog.tsx en
 * /schedules, fijo a la fecha/clase de hoy en vez de un selector libre.
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
    history,
    pendingReservationId,
    pendingStatus,
    handleStatusChange,
    memberQuery,
    setMemberQuery,
    filteredMembers,
    addingMemberId,
    handleAddReservation,
  } = useCurrentClass();

  return (
    <section className={styles.column} aria-label="Clase actual">
      <h2 className={styles.columnTitle}>Clase actual</h2>

      {loading ? (
        <CurrentClassSkeleton />
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
                        {pendingReservationId === r.id && pendingStatus === "attended"
                          ? "Marcando..."
                          : "Presente"}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={pendingReservationId === r.id}
                        onClick={() => handleStatusChange(r, "absent")}
                      >
                        {pendingReservationId === r.id && pendingStatus === "absent"
                          ? "Marcando..."
                          : "Ausente"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Agregar reserva</h3>
            <Input
              placeholder="Buscar socio por nombre..."
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            {filteredMembers.length > 0 && (
              <ul className={styles.list}>
                {filteredMembers.map((m) => (
                  <li key={m.id} className={styles.row}>
                    <span className={styles.name}>
                      {m.firstName} {m.lastName}
                    </span>
                    <Button
                      size="xs"
                      disabled={addingMemberId === m.id}
                      onClick={() => handleAddReservation(m.id)}
                    >
                      {addingMemberId === m.id ? "Reservando..." : "Reservar"}
                    </Button>
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

          {history.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Historial ({history.length})</h3>
              <ul className={styles.list}>
                {history.map((r) => (
                  <li key={r.id} className={styles.row}>
                    <span className={styles.name}>
                      {r.firstName} {r.lastName}
                    </span>
                    <StatusPill tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</StatusPill>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
