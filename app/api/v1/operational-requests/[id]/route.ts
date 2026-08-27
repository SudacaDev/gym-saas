import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { operationalRequestStatusUpdateSchema } from "@/lib/validations/operational-request.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Owner+staff, same tier as the list/create endpoints — a PATCH here only
// ever flips open<->resolved (see operational-request.schema.ts), never
// re-edits the original description/category.
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = operationalRequestStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const [row] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.operationalRequests)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(schema.operationalRequests.id, id))
        .returning(),
    );

    if (!row) {
      return NextResponse.json({ error: "Necesidad no encontrada" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    return handleApiError(error);
  }
}
