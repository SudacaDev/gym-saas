import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewMembership } from "@/db/schema/memberships";
import { membershipUpdateSchema } from "@/lib/validations/membership.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Update a membership's lifecycle: pause/cancel/reactivate (status) or
// manually correct endDate. No GET/DELETE here — a single membership is
// only ever fetched as part of a member's history (GET
// /api/v1/memberships?memberId=...), and it's never deleted (see
// db/schema/memberships.ts's docstring: history is append-only, status
// tracks the lifecycle).
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = membershipUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const updates: Partial<NewMembership> = { updatedAt: new Date() };
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;

    const [membership] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .update(schema.memberships)
          .set(updates)
          .where(eq(schema.memberships.id, id))
          .returning(),
    );

    if (!membership) {
      return NextResponse.json(
        { error: "Membresía no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(membership);
  } catch (error) {
    return handleApiError(error);
  }
}
