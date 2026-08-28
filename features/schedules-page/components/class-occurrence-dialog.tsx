"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { Member } from "@/db/schema/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill, type StatusPillTone } from "@/components/status-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DAY_LABELS, nextDateForDay } from "../lib/day-labels";
import type { OccurrenceData, OccurrenceReservation, ReservationStatus } from "../types";
import { ClassOccurrenceSkeleton } from "./class-occurrence-skeleton";
import styles from "./class-occurrence-dialog.module.css";

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

interface ClassOccurrenceDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  schedule: ClassSchedule;
  activityName: string;
}

/**
 * Cupo/reservas/lista de espera de UNA fecha concreta de un class_schedules
 * slot (T-20260826-011). Opens defaulting to the next real calendar date
 * that slot's weekday falls on (today included) — the date input lets
 * staff jump to any other date the same recurring slot happens on.
 *
 * Scoped to ScheduleTableView only for this first pass (same call
 * T-20260825-007 made for empty-cell create) — kanban/calendar views don't
 * get this trigger yet.
 */
export function ClassOccurrenceDialog({ trigger, schedule, activityName }: ClassOccurrenceDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => nextDateForDay(schedule.dayOfWeek));
  const [occurrence, setOccurrence] = useState<OccurrenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [pendingReservationId, setPendingReservationId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ReservationStatus | null>(null);
  const [reservingMemberId, setReservingMemberId] = useState<string | null>(null);

  const loadOccurrence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/schedules/${schedule.id}/occurrences?date=${date}`);
      if (!res.ok) {
        setError("No se pudo cargar la clase");
        return;
      }
      setOccurrence(await res.json());
    } finally {
      setLoading(false);
    }
  }, [schedule.id, date]);

  useEffect(() => {
    if (!open) return;
    loadOccurrence();
  }, [open, loadOccurrence]);

  useEffect(() => {
    if (!open || members.length > 0) return;
    fetch("/api/v1/members")
      .then((res) => (res.ok ? res.json() : []))
      .then(setMembers);
  }, [open, members.length]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDate(nextDateForDay(schedule.dayOfWeek));
      setOccurrence(null);
      setError(null);
      setMemberQuery("");
    }
  }

  async function handleAddReservation(memberId: string) {
    if (reservingMemberId) return; // avoid double-submit while one is in flight
    setError(null);
    setReservingMemberId(memberId);
    try {
      const res = await fetch(`/api/v1/schedules/${schedule.id}/occurrences/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, memberId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "No se pudo agregar la reserva");
        return;
      }
      setMemberQuery("");
      await loadOccurrence();
    } finally {
      setReservingMemberId(null);
    }
  }

  async function handleStatusChange(
    reservation: OccurrenceReservation,
    status: "attended" | "absent" | "cancelled",
  ) {
    setError(null);
    setPendingReservationId(reservation.id);
    setPendingStatus(status);
    try {
      const res = await fetch(
        `/api/v1/schedules/${schedule.id}/occurrences/reservations/${reservation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        setError("No se pudo actualizar la reserva");
        return;
      }
      await loadOccurrence();
    } finally {
      setPendingReservationId(null);
      setPendingStatus(null);
    }
  }

  // Members with an active (non-cancelled) reservation for this occurrence
  // don't show up in the "agregar reserva" search — matches the DB's own
  // partial unique index, see db/schema/class-reservations.ts.
  const reservedMemberIds = useMemo(
    () =>
      new Set(
        (occurrence?.reservations ?? [])
          .filter((r) => r.status !== "cancelled")
          .map((r) => r.memberId),
      ),
    [occurrence],
  );

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return [];
    return members
      .filter((m) => !reservedMemberIds.has(m.id))
      .filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [members, memberQuery, reservedMemberIds]);

  const reserved = occurrence?.reservations.filter((r) => r.status === "reserved") ?? [];
  const waitlisted = occurrence?.reservations.filter((r) => r.status === "waitlisted") ?? [];
  const history =
    occurrence?.reservations.filter((r) =>
      (["attended", "absent", "cancelled"] as ReservationStatus[]).includes(r.status),
    ) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {DAY_LABELS[schedule.dayOfWeek]} {schedule.startTime.slice(0, 5)} · {activityName}
          </DialogTitle>
          <DialogDescription>Cupo, reservas y lista de espera para esta fecha.</DialogDescription>
        </DialogHeader>

        <div className={styles.dateRow}>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.dateInput}
          />
          <span className={styles.capacityText}>
            {loading ? "…" : occurrence ? `${reserved.length}/${occurrence.capacity ?? "∞"}` : ""}
          </span>
        </div>

        {error && (
          <p role="alert" className={styles.errorText}>
            {error}
          </p>
        )}

        {loading ? (
          <ClassOccurrenceSkeleton />
        ) : (
          <div className={styles.sections}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Reservados ({reserved.length})</h3>
              {reserved.length === 0 ? (
                <p className={styles.emptyText}>Nadie reservó todavía.</p>
              ) : (
                <ul className={styles.list}>
                  {reserved.map((r) => {
                    const isRowPending = pendingReservationId === r.id;
                    return (
                      <li key={r.id} className={styles.row}>
                        <span className={styles.name}>
                          {r.firstName} {r.lastName}
                        </span>
                        <div className={styles.rowActions}>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={isRowPending}
                            onClick={() => handleStatusChange(r, "attended")}
                          >
                            {isRowPending && pendingStatus === "attended" ? "..." : "Presente"}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={isRowPending}
                            onClick={() => handleStatusChange(r, "absent")}
                          >
                            {isRowPending && pendingStatus === "absent" ? "..." : "Ausente"}
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={isRowPending}
                            onClick={() => handleStatusChange(r, "cancelled")}
                          >
                            {isRowPending && pendingStatus === "cancelled" ? "..." : "Cancelar"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className={styles.section}>
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
                      <StatusPill tone={STATUS_TONES[r.status]}>
                        {STATUS_LABELS[r.status]}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section}>
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
                        disabled={reservingMemberId === m.id}
                        onClick={() => handleAddReservation(m.id)}
                      >
                        {reservingMemberId === m.id ? "Reservando..." : "Reservar"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {history.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Historial</h3>
                <ul className={styles.list}>
                  {history.map((r) => (
                    <li key={r.id} className={styles.row}>
                      <span className={styles.name}>
                        {r.firstName} {r.lastName}
                      </span>
                      <StatusPill tone={STATUS_TONES[r.status]}>
                        {STATUS_LABELS[r.status]}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
