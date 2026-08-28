"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { Activity } from "@/db/schema/activities";

/** Shape returned by GET /api/v1/staff/instructors — see that route's docstring for why it's narrower than the full staff roster. */
export interface InstructorOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface UseSchedulesResult {
  schedules: ClassSchedule[];
  activities: Activity[];
  instructors: InstructorOption[];
  loading: boolean;
  error: string | null;
  activityNameById: Map<string, string>;
  handleActivityCreated: (activity: Activity) => void;
  handleSaved: (saved: ClassSchedule) => void;
  handleRemoved: (id: string) => void;
  handleDelete: (schedule: ClassSchedule) => Promise<void>;
  /** `class_schedules.id` currently mid-DELETE, or null — drives the "Borrando..." button feedback. */
  deletingId: string | null;
}

/**
 * Shared fetch + CRUD-callback state for `class_schedules`/`activities`,
 * extracted out of the page so all three views (table/kanban/calendar) read
 * and mutate the same in-memory state instead of each firing its own
 * fetch — there's only one underlying dataset, the views just render it
 * differently (T-20260825-006).
 */
export function useSchedules(): UseSchedulesResult {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, activitiesRes, instructorsRes] = await Promise.all([
        fetch("/api/v1/schedules"),
        fetch("/api/v1/activities"),
        fetch("/api/v1/staff/instructors"),
      ]);
      if (schedulesRes.ok) {
        setSchedules(await schedulesRes.json());
      }
      if (activitiesRes.ok) {
        setActivities(await activitiesRes.json());
      }
      if (instructorsRes.ok) {
        setInstructors(await instructorsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const activityNameById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity.name])),
    [activities],
  );

  const handleActivityCreated = useCallback((activity: Activity) => {
    setActivities((prev) =>
      prev.some((a) => a.id === activity.id) ? prev : [...prev, activity],
    );
  }, []);

  const handleSaved = useCallback((saved: ClassSchedule) => {
    setError(null);
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      return exists
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [...prev, saved];
    });
  }, []);

  const handleRemoved = useCallback((id: string) => {
    setError(null);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleDelete = useCallback(
    async (schedule: ClassSchedule) => {
      setError(null);
      const activityLabel =
        activityNameById.get(schedule.activityId) ?? "esta clase";
      if (!confirm(`¿Borrar "${activityLabel}"?`)) return;

      setDeletingId(schedule.id);
      try {
        const res = await fetch(`/api/v1/schedules/${schedule.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(
            typeof body?.error === "string" ? body.error : "No se pudo borrar el horario",
          );
          return;
        }
        setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      } finally {
        setDeletingId(null);
      }
    },
    [activityNameById],
  );

  return {
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
  };
}
