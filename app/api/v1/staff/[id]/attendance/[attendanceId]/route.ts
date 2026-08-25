import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string; attendanceId: string }>;
}

// Owner+staff, same permission decision as app/api/v1/staff/[id]/attendance/route.ts
// (see its docstring for the full reasoning — this is the "clock out"
// counterpart to that route's "clock in").
//
// PATCH — clocks a staff member out: sets clockOut = now() on that
// specific row. No request body: single action, not a field update, same
// as checkins' PATCH /api/v1/checkins/[id]. The WHERE requires the row to
// belong to this staffMemberId AND still be open (clockOut IS NULL), so a
// second call (double-click, stale tab, or an attendanceId that belongs to
// a different staff member) is a no-op 404 instead of silently overwriting
// the real clock-out time or closing someone else's row.
export async function PATCH(_request: Request, { params }: RouteParams) {
  try {
    const { id, attendanceId } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const [attendance] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.staffAttendance)
        .set({ clockOut: new Date() })
        .where(
          and(
            eq(schema.staffAttendance.id, attendanceId),
            eq(schema.staffAttendance.staffMemberId, id),
            isNull(schema.staffAttendance.clockOut),
          ),
        )
        .returning(),
    );

    if (!attendance) {
      return NextResponse.json(
        { error: "Fichaje no encontrado o ya tiene salida registrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(attendance);
  } catch (error) {
    return handleApiError(error);
  }
}
