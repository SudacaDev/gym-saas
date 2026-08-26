import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { activitySchema } from "@/lib/validations/activity.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const activities = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) => tx.select().from(schema.activities).orderBy(schema.activities.name),
    );

    return NextResponse.json(activities);
  } catch (error) {
    return handleApiError(error);
  }
}

// Quick-add desde el picker de "Horarios" (owner y staff arman el horario
// por igual, así que también pueden dar de alta una actividad ahí mismo).
// Get-or-create por nombre vía ON CONFLICT: si ya existía una actividad con
// ese nombre para el tenant (índice único `activities_tenant_id_name_unique`)
// se devuelve la existente en vez de fallar — el operador no necesita saber
// si ya estaba cargada. Un select-then-insert en dos pasos no sirve acá
// porque withTenantContext corre todo dentro de una transacción real: un
// insert fallido por violación de unicidad la deja abortada y cualquier
// query siguiente en la misma transacción también fallaría.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = activitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const [activity] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .insert(schema.activities)
          .values({ tenantId: context.tenantId, name: parsed.data.name })
          .onConflictDoUpdate({
            target: [schema.activities.tenantId, schema.activities.name],
            set: { updatedAt: new Date() },
          })
          .returning(),
    );

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
