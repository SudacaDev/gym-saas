import type { ClassSchedule } from "@/db/schema/class-schedules";
import type { Activity } from "@/db/schema/activities";

/**
 * Shared prop shape for the three schedule views (table/kanban/calendar) —
 * all three render the same `class_schedules` data and drive the same
 * `ScheduleFormDialog` CRUD callbacks from `useSchedules`, just with a
 * different layout.
 */
export interface ScheduleViewProps {
  schedules: ClassSchedule[];
  activities: Activity[];
  activityNameById: Map<string, string>;
  onSaved: (schedule: ClassSchedule) => void;
  onRemoved: (id: string) => void;
  onActivityCreated: (activity: Activity) => void;
  onDelete: (schedule: ClassSchedule) => void | Promise<void>;
}
