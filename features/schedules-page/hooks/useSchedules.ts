"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { Activity } from "@/db/schema/activities";

export interface UseSchedulesResult {
  schedules: ClassSchedule[];
  activities: Activity[];
  loading: boolean;
  error: string | null;
  activityNameById: Map<string, string>;
  handleActivityCreated: (activity: Activity) => void;
  handleSaved: (saved: ClassSchedule) => void;
  handleRemoved: (id: string) => void;
  handleDelete: (schedule: ClassSchedule) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, activitiesRes] = await Promise.all([
        fetch("/api/v1/schedules"),
        fetch("/api/v1/activities"),
      ]);
      if (schedulesRes.ok) {
        setSchedules(await schedulesRes.json());
      }
      if (activitiesRes.ok) {
        setActivities(await activitiesRes.json());
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
    },
    [activityNameById],
  );

  return {
    schedules,
    activities,
    loading,
    error,
    activityNameById,
    handleActivityCreated,
    handleSaved,
    handleRemoved,
    handleDelete,
  };
}
