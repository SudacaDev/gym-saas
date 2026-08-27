"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { ClassReservation } from "@/db/schema/class-reservations";
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

  async function handleStatusChange(
    reservation: CurrentClassReservation,
    status: "attended" | "absent",
  ) {
    if (!currentSchedule) return;
    setError(null);
    setPendingReservationId(reservation.id);
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
    pendingReservationId,
    handleStatusChange,
  };
}
