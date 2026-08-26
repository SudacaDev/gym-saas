import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewPlan } from "@/db/schema/plans";
import { planSchema } from "@/lib/validations/plan.schema";
import { handleApiError, isForeignKeyViolation } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    // RLS already scopes this to the caller's tenant — a plan belonging to
    // another tenant simply never matches, same as a plan that doesn't
    // exist at all. Either way: 404, not a 403/leak.
    const [plan] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) => tx.select().from(schema.plans).where(eq(schema.plans.id, id)),
    );

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const body = await request.json();
    const parsed = planSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const updates: Partial<NewPlan> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.price !== undefined)
      updates.price = parsed.data.price.toString();
    if (parsed.data.period !== undefined) updates.period = parsed.data.period;

    const [plan] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .update(schema.plans)
          .set(updates)
          .where(eq(schema.plans.id, id))
          .returning(),
    );

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const [plan] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx.delete(schema.plans).where(eq(schema.plans.id, id)).returning(),
    );

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        { error: "No se puede borrar un plan con membresías activas" },
        { status: 409 },
      );
    }
    return handleApiError(error);
  }
}
