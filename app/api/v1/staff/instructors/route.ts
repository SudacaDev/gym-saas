import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { handleApiError } from "@/lib/api/handle-api-error";

// Deliberately narrower than GET /api/v1/staff (owner-only HR roster, see
// that route's docstring / gate T-20260825-001): this only returns
// {id, firstName, lastName, openAttendanceId} for staffCategory
// "instructor" — no email, no DNI, no shift/department, nothing that route
// was scoped away for. Exists so the schedule form's instructor picker
// (T-20260827-007, owner or an administrativo assigning a class) doesn't
// need the full roster endpoint a non-owner still can't call.
//
// `openAttendanceId` (T-20260827-008) is the same correlated-subquery
// pattern GET /api/v1/staff already uses (see its docstring) — added here
// so the front-desk "Fichar profesor" modal on /checkin can show who's
// currently clocked in and know which row to PATCH for a clock-out,
// without a second round-trip per instructor.
export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const instructors = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .select({
          id: schema.staffMembers.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          openAttendanceId: sql<string | null>`(
            SELECT ${schema.staffAttendance.id} FROM ${schema.staffAttendance}
            WHERE ${schema.staffAttendance.staffMemberId} = ${schema.staffMembers.id}
              AND ${schema.staffAttendance.clockOut} IS NULL
            LIMIT 1
          )`,
        })
        .from(schema.staffMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.staffMembers.userId))
        .where(
          and(
            eq(schema.staffMembers.staffCategory, "instructor"),
            isNull(schema.staffMembers.deletedAt),
          ),
        )
        .orderBy(schema.users.firstName, schema.users.lastName),
    );

    return NextResponse.json(instructors);
  } catch (error) {
    return handleApiError(error);
  }
}
