import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { resolveOwnStaffMember } from "@/lib/staff/resolve-own-staff-member";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { handleApiError } from "@/lib/api/handle-api-error";

// Self-service clock-in/out (T-20260826-007). Unlike
// app/api/v1/staff/[id]/attendance/**, this route never takes a
// staffMemberId from the caller — it always resolves "me" from the
// authenticated session, so a staff member can only ever clock themselves
// in/out, never someone else. POST fires right after sign-in succeeds,
// PATCH right before sign-out clears the session (see
// features/sign-in-page/components/sign-in-form.tsx and
// app/(owner)/presence-widget.tsx — PATCH has to run there before
// supabase.auth.signOut(), while the session is still valid).
//
// Both handlers are deliberately best-effort and idempotent: a login or
// logout must never fail because of an attendance hiccup, and calling this
// twice (two tabs, a retried request) is a no-op, not an error. Anyone who
// isn't `staff`, or has no staffMembers row (owner, or a staff account
// mid-deletion), gets a silent `{ skipped: true }` — same status code
// either way, since "nothing to do" isn't a client error here.
//
// "cleaning" staff not self-servicing their attendance (T-20260826-007's
// product decision — the manual toggle in features/staff-page/index.tsx
// stays theirs alone) is enforced by that UI simply never calling this
// route for them, not by a role/category check here — if a cleaning
// account ever does hit this endpoint directly, clocking their own real
// session in/out isn't actually wrong, just outside the intended flow.

export async function POST() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    if (context.role !== "staff") {
      return NextResponse.json({ skipped: true });
    }

    const ownStaffMember = await resolveOwnStaffMember(context);
    if (!ownStaffMember) {
      return NextResponse.json({ skipped: true });
    }
    const staffMemberId = ownStaffMember.id;

    const result = await withTenantContext(context.tenantId, context.role, async (tx) => {
      const [openRow] = await tx
        .select({ id: schema.staffAttendance.id })
        .from(schema.staffAttendance)
        .where(
          and(
            eq(schema.staffAttendance.staffMemberId, staffMemberId),
            isNull(schema.staffAttendance.clockOut),
          ),
        );
      if (openRow) {
        return { skipped: true } as const;
      }

      const [attendance] = await tx
        .insert(schema.staffAttendance)
        .values({ tenantId: context.tenantId, staffMemberId })
        .returning();
      return attendance;
    });

    return NextResponse.json(result, { status: "skipped" in result ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    if (context.role !== "staff") {
      return NextResponse.json({ skipped: true });
    }

    const ownStaffMember = await resolveOwnStaffMember(context);
    if (!ownStaffMember) {
      return NextResponse.json({ skipped: true });
    }
    const staffMemberId = ownStaffMember.id;

    const [attendance] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.staffAttendance)
        .set({ clockOut: new Date() })
        .where(
          and(
            eq(schema.staffAttendance.staffMemberId, staffMemberId),
            isNull(schema.staffAttendance.clockOut),
          ),
        )
        .returning(),
    );

    return NextResponse.json(attendance ?? { skipped: true });
  } catch (error) {
    return handleApiError(error);
  }
}
