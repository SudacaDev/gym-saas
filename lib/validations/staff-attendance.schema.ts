import { z } from "zod";

// Clock-in (POST /api/v1/staff/[id]/attendance) only needs to confirm the
// staffMemberId in the route param matches what the client thinks it's
// clocking in — `id` in the URL is the source of truth server-side, this
// is not currently used to override it, kept for symmetry/future-proofing
// (e.g. a tenant-wide "clock in" screen that doesn't come from a
// per-staff-member route). Nothing is needed client-side for clock-out —
// the server resolves the open row from the URL params alone.
export const staffAttendanceClockInSchema = z.object({
  staffMemberId: z.uuid("Persona inválida"),
});

export type StaffAttendanceClockInInput = z.input<typeof staffAttendanceClockInSchema>;
export type StaffAttendanceClockInOutput = z.output<typeof staffAttendanceClockInSchema>;
