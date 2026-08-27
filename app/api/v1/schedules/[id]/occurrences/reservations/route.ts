import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { reservationCreateSchema } from "@/lib/validations/reservation.schema";
import { handleApiError, isUniqueViolation } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Reserves a member into one date's occurrence of a class_schedules slot
// (T-20260826-011). Lazily creates the class_occurrences row on first
// write for that (classScheduleId, date) — see db/schema/class-occurrences.ts.
// Whether the reservation lands "reserved" or "waitlisted" is decided here
// server-side (never client-chosen): under the effective capacity ->
// reserved, at/over it -> waitlisted. `class_reservations_active_unique`
// (see db/schema/class-reservations.ts) is the real guard against
// double-booking the same member into the same occurrence — this doesn't
// pre-check for it, it just catches the resulting unique violation.
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = reservationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    try {
      const result = await withTenantContext(context.tenantId, context.role, async (tx) => {
        const [classSchedule] = await tx
          .select({ id: schema.classSchedules.id, capacity: schema.classSchedules.capacity })
          .from(schema.classSchedules)
          .where(eq(schema.classSchedules.id, id));
        if (!classSchedule) {
          return "schedule_not_found" as const;
        }

        let [occurrence] = await tx
          .select()
          .from(schema.classOccurrences)
          .where(
            and(
              eq(schema.classOccurrences.classScheduleId, id),
              eq(schema.classOccurrences.date, parsed.data.date),
            ),
          );

        if (!occurrence) {
          [occurrence] = await tx
            .insert(schema.classOccurrences)
            .values({
              tenantId: context.tenantId,
              classScheduleId: id,
              date: parsed.data.date,
            })
            .returning();
        }

        const effectiveCapacity = occurrence.capacity ?? classSchedule.capacity ?? null;

        const [{ reservedCount }] = await tx
          .select({ reservedCount: sql<number>`count(*)::int` })
          .from(schema.classReservations)
          .where(
            and(
              eq(schema.classReservations.classOccurrenceId, occurrence.id),
              eq(schema.classReservations.status, "reserved"),
            ),
          );

        const status =
          effectiveCapacity !== null && reservedCount >= effectiveCapacity
            ? ("waitlisted" as const)
            : ("reserved" as const);

        const [reservation] = await tx
          .insert(schema.classReservations)
          .values({
            tenantId: context.tenantId,
            classOccurrenceId: occurrence.id,
            memberId: parsed.data.memberId,
            status,
          })
          .returning();

        return reservation;
      });

      if (result === "schedule_not_found") {
        return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
      }

      return NextResponse.json(result, { status: 201 });
    } catch (dbError) {
      if (isUniqueViolation(dbError, "class_reservations_active_unique")) {
        return NextResponse.json(
          { error: "Este socio ya tiene una reserva para esta clase" },
          { status: 409 },
        );
      }
      throw dbError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
