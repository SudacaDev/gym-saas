import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { staffAttendanceClockInSchema } from "@/lib/validations/staff-attendance.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Owner+staff, NOT owner-only like the rest of app/api/v1/staff/** since
// T-20260825-001 tightened that roster's GET/POST/PATCH/DELETE to
// owner-only. This sub-resource is a deliberate exception: decision #1
// confirmed with the user for this task ("lo carga el owner/otro staff por
// él") explicitly names staff as someone who can clock a colleague
// in/out — this endpoint only exposes clock-in/out timestamps for a
// single staffMemberId, never the HR roster fields (DNI, emergency
// contact, category, etc.) that T-20260825-001 restricted. GET is also
// owner+staff (not just POST/PATCH) so a future front-desk-facing screen
// can render the "Fichar entrada"/"Fichar salida" toggle correctly without
// needing owner-only access — see the gate for the full reasoning.
//
// GET — this staff member's attendance history, most recent first (the
// "listado básico" required by this task). No ?open=true filter like
// checkins' GET: the expected volume per staff member is small (one row
// per shift, not per visit), so returning full history is cheap and the
// UI can derive "currently clocked in" from `clockOut === null` on the
// first row itself, no separate query.
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const rows = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .select()
        .from(schema.staffAttendance)
        .where(eq(schema.staffAttendance.staffMemberId, id))
        .orderBy(desc(schema.staffAttendance.clockIn)),
    );

    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST — clocks a staff member in: inserts a new open row (clockOut =
// NULL). Rejects with 409 if that staff member already has an open row —
// no double clock-in, same intent as checkins' PATCH guarding against a
// double checkout via its WHERE clause, just enforced on the way in here
// instead of the way out.
//
// Body only needs `staffMemberId` (per staffAttendanceClockInSchema) and
// it must match the `id` route param — the URL is the source of truth for
// which staff member this write applies to; the body field exists so a
// future non-nested caller (e.g. a tenant-wide "clock in" screen) can
// reuse the same schema, and as a defense-in-depth check against a stale
// client sending the wrong body for the URL it's calling.
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json().catch(() => ({}));
    const parsed = staffAttendanceClockInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    if (parsed.data.staffMemberId !== id) {
      return NextResponse.json(
        { error: "El staffMemberId del body no coincide con la URL" },
        { status: 400 },
      );
    }

    const result = await withTenantContext(context.tenantId, context.role, async (tx) => {
      const [staffMember] = await tx
        .select({ id: schema.staffMembers.id })
        .from(schema.staffMembers)
        .where(and(eq(schema.staffMembers.id, id), isNull(schema.staffMembers.deletedAt)));

      if (!staffMember) {
        return "not_found" as const;
      }

      const [openRow] = await tx
        .select({ id: schema.staffAttendance.id })
        .from(schema.staffAttendance)
        .where(
          and(
            eq(schema.staffAttendance.staffMemberId, id),
            isNull(schema.staffAttendance.clockOut),
          ),
        );

      if (openRow) {
        return "already_open" as const;
      }

      const [attendance] = await tx
        .insert(schema.staffAttendance)
        .values({
          tenantId: context.tenantId,
          staffMemberId: id,
        })
        .returning();

      return attendance;
    });

    if (result === "not_found") {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }
    if (result === "already_open") {
      return NextResponse.json(
        { error: "Esta persona ya tiene una entrada fichada sin salida registrada" },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
