import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// One date's occurrence of a recurring class_schedules slot (T-20260826-011)
// — capacity + who's reserved/waitlisted/attended/absent/cancelled. Never
// creates a class_occurrences row (that only happens lazily on the first
// write, see the POST reservations route below): if none exists yet for
// this date, this synthesizes the "nobody's booked this yet" response
// (capacity from the slot's own default, empty reservation list) instead
// of a 404 — an occurrence with zero reservations is a completely normal,
// expected state, not an error.
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const date = new URL(request.url).searchParams.get("date");
    if (!date || !DATE_PATTERN.test(date)) {
      return NextResponse.json(
        { error: "Falta el parámetro date (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const result = await withTenantContext(context.tenantId, context.role, async (tx) => {
      const [classSchedule] = await tx
        .select({ id: schema.classSchedules.id, capacity: schema.classSchedules.capacity })
        .from(schema.classSchedules)
        .where(eq(schema.classSchedules.id, id));
      if (!classSchedule) {
        return "not_found" as const;
      }

      const [occurrence] = await tx
        .select()
        .from(schema.classOccurrences)
        .where(
          and(
            eq(schema.classOccurrences.classScheduleId, id),
            eq(schema.classOccurrences.date, date),
          ),
        );

      const reservations = occurrence
        ? await tx
            .select({
              id: schema.classReservations.id,
              status: schema.classReservations.status,
              createdAt: schema.classReservations.createdAt,
              memberId: schema.classReservations.memberId,
              firstName: schema.members.firstName,
              lastName: schema.members.lastName,
            })
            .from(schema.classReservations)
            .innerJoin(schema.members, eq(schema.members.id, schema.classReservations.memberId))
            .where(eq(schema.classReservations.classOccurrenceId, occurrence.id))
            .orderBy(asc(schema.classReservations.createdAt))
        : [];

      return {
        date,
        capacity: occurrence?.capacity ?? classSchedule.capacity ?? null,
        reservations,
      };
    });

    if (result === "not_found") {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
