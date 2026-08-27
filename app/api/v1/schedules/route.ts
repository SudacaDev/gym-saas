import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { scheduleSchema } from "@/lib/validations/schedule.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const schedules = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) => tx.select().from(schema.classSchedules),
    );

    return NextResponse.json(schedules);
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner y staff pueden armar/ajustar el horario semanal por igual.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const [classSchedule] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .insert(schema.classSchedules)
          .values({
            tenantId: context.tenantId,
            dayOfWeek: parsed.data.dayOfWeek,
            startTime: parsed.data.startTime,
            endTime: parsed.data.endTime,
            activityId: parsed.data.activityId,
            capacity: parsed.data.capacity ?? null,
          })
          .returning(),
    );

    return NextResponse.json(classSchedule, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
