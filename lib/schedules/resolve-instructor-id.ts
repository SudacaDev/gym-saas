import type { TenantContext } from "@/lib/auth/get-tenant-context";
import { resolveOwnStaffMember } from "@/lib/staff/resolve-own-staff-member";

export interface InstructorIdResolution {
  /**
   * Whether this write should touch `instructorId` at all. Always `true`
   * when forced (a profesor writing their own class) or when the client
   * explicitly sent the field; `false` on a partial update that didn't
   * mention it, so a PATCH touching only e.g. `capacity` can't silently
   * blank an existing instructor.
   */
  shouldSet: boolean;
  value: string | null;
}

/**
 * Resolves the instructorId a class_schedules write should actually use
 * (T-20260827-007): a profesor always gets self-assigned, ignoring
 * whatever the client sent — they can't put their own class under someone
 * else's name, and don't need a picker to find their own id. Anyone else
 * (owner, or a non-instructor staff category like the front-desk
 * administrativo) gets whatever the form submitted, including null to
 * explicitly clear it. Shared by both app/api/v1/schedules/route.ts's POST
 * (always applies the value — an insert always sets the column, same as
 * `capacity ?? null` there) and [id]/route.ts's PATCH (only applies it
 * when `shouldSet`, matching that route's partial-update convention).
 */
export async function resolveInstructorId(
  context: TenantContext,
  requested: string | null | undefined,
): Promise<InstructorIdResolution> {
  if (context.role === "staff") {
    const ownStaffMember = await resolveOwnStaffMember(context);
    if (ownStaffMember?.staffCategory === "instructor") {
      return { shouldSet: true, value: ownStaffMember.id };
    }
  }
  return { shouldSet: requested !== undefined, value: requested ?? null };
}
