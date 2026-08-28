"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { ClassReservation } from "@/db/schema/class-reservations";
import type { Member } from "@/db/schema/members";
import { findCurrentSchedule, todayDateString } from "../lib/current-class";

export type ReservationStatus = ClassReservation["status"];

/** Shape returned by GET app/api/v1/schedules/[id]/occurrences?date=. */
export interface CurrentClassReservation {
  id: string;
  status: ReservationStatus;
  createdAt: string;
  memberId: string;
  firstName: string | null;
  lastName: string | null;
}

interface OccurrenceData {
  date: string;
  capacity: number | null;
  reservations: CurrentClassReservation[];
}

interface Activity {
  id: string;
  name: string;
}

/**
 * "Clase actual" column state (T-20260826-015): resolves which
 * `class_schedules` slot is in progress right now (day-of-week + time
 * window, see lib/current-class.ts), then loads/mutates today's
 * `class_occurrences` row for it — same endpoints
 * features/schedules-page/components/class-occurrence-dialog.tsx already
 * uses for the same data, just fixed to "today, current slot" instead of a
 * staff-picked schedule/date. Deliberately doesn't import that dialog's
 * component or hook logic — this project's features don't import each
 * other's files (verified via reducto: no `@/features/*` import exists
 * anywhere under features/) — so the fetch/state here is a small,
 * intentional duplicate of the same pattern, not a shared abstraction.
 *
 * "Current" is resolved once per mount from `now = new Date()`, not
 * re-evaluated on a timer — if the in-progress class changes while this
 * screen is left open (one ends, the next starts), a refresh picks it up.
 * No polling/websocket was built for this (T-20260826-015 explicitly asked
 * not to invent real-time infra where none exists yet).
 */
export function useCurrentClass() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [occurrence, setOccurrence] = useState<OccurrenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [occurrenceLoading, setOccurrenceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReservationId, setPendingReservationId] = useState<string | null>(null);
  // Paired with pendingReservationId only to tell "Presente"/"Ausente"
  // apart for button text feedback (T-20260827-002) — both buttons on the
  // same row already disable together via pendingReservationId, this just
  // says which of the two was actually clicked.
  const [pendingStatus, setPendingStatus] = useState<"attended" | "absent" | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  // Per-member pending flag for "Reservar" (T-20260827-002) — several
  // filtered members can be on screen at once, only the one actually
  // clicked should show "Reservando...".
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, activitiesRes] = await Promise.all([
        fetch("/api/v1/schedules"),
        fetch("/api/v1/activities"),
      ]);
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (activitiesRes.ok) setActivities(await activitiesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const currentSchedule = useMemo(() => findCurrentSchedule(schedules, now), [schedules, now]);

  const activityNameById = useMemo(
    () => new Map(activities.map((a) => [a.id, a.name])),
    [activities],
  );

  const loadOccurrence = useCallback(async () => {
    if (!currentSchedule) {
      setOccurrence(null);
      return;
    }
    setError(null);
    setOccurrenceLoading(true);
    try {
      const date = todayDateString(now);
      const res = await fetch(`/api/v1/schedules/${currentSchedule.id}/occurrences?date=${date}`);
      if (!res.ok) {
        setError("No se pudo cargar la clase actual");
        return;
      }
      setOccurrence(await res.json());
    } finally {
      setOccurrenceLoading(false);
    }
  }, [currentSchedule, now]);

  useEffect(() => {
    loadOccurrence();
  }, [loadOccurrence]);

  useEffect(() => {
    fetch("/api/v1/members")
      .then((res) => (res.ok ? res.json() : []))
      .then(setMembers);
  }, []);

  // Mirrors class-occurrence-dialog.tsx's "Agregar reserva" — same request
  // shape, same member-search UX, requested by the user as the missing
  // piece to make this column an actual one-stop "modo rápido" (T-015
  // originally left this out on purpose, reserving it for /schedules only).
  async function handleAddReservation(memberId: string) {
    if (!currentSchedule) return;
    setError(null);
    setAddingMemberId(memberId);
    try {
      const date = todayDateString(now);
      const res = await fetch(`/api/v1/schedules/${currentSchedule.id}/occurrences/reservations`, {
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
      setAddingMemberId(null);
    }
  }

  async function handleStatusChange(
    reservation: CurrentClassReservation,
    status: "attended" | "absent",
  ) {
    if (!currentSchedule) return;
    setError(null);
    setPendingReservationId(reservation.id);
    setPendingStatus(status);
    try {
      const res = await fetch(
        `/api/v1/schedules/${currentSchedule.id}/occurrences/reservations/${reservation.id}`,
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
      // The PATCH atomically promotes the oldest waitlisted reservation
      // when this frees a reserved slot (see the route's docstring) —
      // reloading is what surfaces that promotion here, there's nothing
      // else to merge client-side.
      await loadOccurrence();
    } finally {
      setPendingReservationId(null);
      setPendingStatus(null);
    }
  }

  const reserved = useMemo(
    () => occurrence?.reservations.filter((r) => r.status === "reserved") ?? [],
    [occurrence],
  );
  const waitlisted = useMemo(
    () => occurrence?.reservations.filter((r) => r.status === "waitlisted") ?? [],
    [occurrence],
  );
  // "Presente"/"Ausente" moves a reservation OUT of `reserved` (its status
  // stops being "reserved") — without this list that reservation vanishes
  // from the column entirely, reading as if marking someone present had
  // removed them from the class instead of recording attendance. Mirrors
  // class-occurrence-dialog.tsx's "Historial" grouping (same 3 statuses).
  const history = useMemo(
    () =>
      occurrence?.reservations.filter((r) =>
        (["attended", "absent", "cancelled"] as ReservationStatus[]).includes(r.status),
      ) ?? [],
    [occurrence],
  );

  // Members with an active (non-cancelled) reservation for this occurrence
  // don't show up in the search — matches the DB's own partial unique
  // index, see db/schema/class-reservations.ts.
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

  return {
    loading,
    occurrenceLoading,
    error,
    currentSchedule,
    activityName: currentSchedule
      ? (activityNameById.get(currentSchedule.activityId) ?? "Actividad")
      : null,
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
  };
}
