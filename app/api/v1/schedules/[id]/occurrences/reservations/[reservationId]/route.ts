import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { reservationStatusUpdateSchema } from "@/lib/validations/reservation.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string; reservationId: string }>;
}

// Moves a reservation to attended/absent/cancelled (T-20260826-011).
// Freeing a "reserved" slot (-> absent or cancelled) atomically promotes
// the oldest "waitlisted" reservation for the same occurrence, in the same
// transaction — same reasoning as db/schema/class-reservations.ts's
// docstring: staff resolves "someone's waiting at the counter right now"
// with one click, not a separate "promote" action they have to remember.
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, reservationId } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = reservationStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const result = await withTenantContext(context.tenantId, context.role, async (tx) => {
      const [existing] = await tx
        .select({
          id: schema.classReservations.id,
          status: schema.classReservations.status,
          classOccurrenceId: schema.classReservations.classOccurrenceId,
        })
        .from(schema.classReservations)
        .innerJoin(
          schema.classOccurrences,
          eq(schema.classOccurrences.id, schema.classReservations.classOccurrenceId),
        )
        .where(
          and(
            eq(schema.classReservations.id, reservationId),
            eq(schema.classOccurrences.classScheduleId, id),
          ),
        );

      if (!existing) {
        return "not_found" as const;
      }

      const [updated] = await tx
        .update(schema.classReservations)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(schema.classReservations.id, reservationId))
        .returning();

      const freedASlot =
        existing.status === "reserved" &&
        (parsed.data.status === "absent" || parsed.data.status === "cancelled");

      if (freedASlot) {
        const [nextInLine] = await tx
          .select({ id: schema.classReservations.id })
          .from(schema.classReservations)
          .where(
            and(
              eq(schema.classReservations.classOccurrenceId, existing.classOccurrenceId),
              eq(schema.classReservations.status, "waitlisted"),
            ),
          )
          .orderBy(asc(schema.classReservations.createdAt))
          .limit(1);

        if (nextInLine) {
          await tx
            .update(schema.classReservations)
            .set({ status: "reserved", updatedAt: new Date() })
            .where(eq(schema.classReservations.id, nextInLine.id));
        }
      }

      return updated;
    });

    if (result === "not_found") {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
