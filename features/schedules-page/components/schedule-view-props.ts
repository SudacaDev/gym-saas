import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { Activity } from "@/db/schema/activities";
import type { InstructorOption } from "../hooks/useSchedules";

/**
 * Shared prop shape for the three schedule views (table/kanban/calendar) —
 * all three render the same `class_schedules` data and drive the same
 * `ScheduleFormDialog` CRUD callbacks from `useSchedules`, just with a
 * different layout.
 */
export interface ScheduleViewProps {
  schedules: ClassSchedule[];
  activities: Activity[];
  /** Forwarded to every inline ScheduleFormDialog (create-from-empty-cell, edit) each view renders — see that component's own docstring. */
  instructors: InstructorOption[];
  selfInstructor?: { id: string; name: string };
  activityNameById: Map<string, string>;
  onSaved: (schedule: ClassSchedule) => void;
  onRemoved: (id: string) => void;
  onActivityCreated: (activity: Activity) => void;
  onDelete: (schedule: ClassSchedule) => void | Promise<void>;
  /** `class_schedules.id` currently mid-DELETE, or null — drives the "Borrando..." button feedback. */
  deletingId: string | null;
}
