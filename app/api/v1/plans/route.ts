import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { planSchema } from "@/lib/validations/plan.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const plans = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) => tx.select().from(schema.plans),
    );

    return NextResponse.json(plans);
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner-only: pricing is the owner's call, not front desk's.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const body = await request.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const [plan] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .insert(schema.plans)
          .values({
            tenantId: context.tenantId,
            name: parsed.data.name,
            price: parsed.data.price.toString(),
            period: parsed.data.period,
          })
          .returning(),
    );

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
