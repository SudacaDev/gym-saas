import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { resolveInstructorId } from "@/lib/schedules/resolve-instructor-id";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewClassSchedule } from "@/db/schema/class-schedules";
import { scheduleSchema } from "@/lib/validations/schedule.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = scheduleSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const updates: Partial<NewClassSchedule> = { updatedAt: new Date() };
    if (parsed.data.dayOfWeek !== undefined) updates.dayOfWeek = parsed.data.dayOfWeek;
    if (parsed.data.startTime !== undefined) updates.startTime = parsed.data.startTime;
    if (parsed.data.endTime !== undefined) updates.endTime = parsed.data.endTime;
    if (parsed.data.activityId !== undefined)
      updates.activityId = parsed.data.activityId;
    if (parsed.data.capacity !== undefined) updates.capacity = parsed.data.capacity ?? null;

    const instructorResolution = await resolveInstructorId(context, parsed.data.instructorId);
    if (instructorResolution.shouldSet) updates.instructorId = instructorResolution.value;

    const [classSchedule] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .update(schema.classSchedules)
          .set(updates)
          .where(eq(schema.classSchedules.id, id))
          .returning(),
    );

    if (!classSchedule) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(classSchedule);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const [classSchedule] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .delete(schema.classSchedules)
          .where(eq(schema.classSchedules.id, id))
          .returning(),
    );

    if (!classSchedule) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
