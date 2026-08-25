import type { StaffMember } from "@/db/schema/staff-members";
import type { StaffAttendance } from "@/db/schema/staff-attendance";

/** Shape returned by GET/POST/PATCH app/api/v1/staff — StaffMember joined with its user's name/email. */
export type StaffMemberRow = Omit<StaffMember, "userId"> & {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  // T-20260825-005: this person's currently-open (not-yet-clocked-out)
  // attendance row id, or null/undefined if none — see the correlated
  // subquery in app/api/v1/staff/route.ts's GET. Only present on that
  // endpoint's response (StaffFormDialog's PATCH/POST responses don't
  // select it, so it's optional here too — treated the same as "closed").
  openAttendanceId?: string | null;
};

/** Shape returned by GET/POST app/api/v1/staff/[id]/attendance. */
export type StaffAttendanceRow = StaffAttendance;

export const CATEGORY_LABELS: Record<StaffMember["staffCategory"], string> = {
  instructor: "Profesor",
  administrative: "Administrativo",
  cleaning: "Limpieza",
};
