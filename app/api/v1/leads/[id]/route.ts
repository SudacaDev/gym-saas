import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { leadStatusUpdateSchema } from "@/lib/validations/lead.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Owner+staff — moving a lead to "convertido"/"perdido" (or back to
// "nuevo") is the same front-desk tier as creating it. Only `status`
// changes here — no full edit of name/whatsapp/note in this first pass
// (not part of the confirmed minimal scope, see lib/validations/lead.schema.ts).
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = leadStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const [lead] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.leads)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(schema.leads.id, id))
        .returning(),
    );

    if (!lead) {
      return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    return handleApiError(error);
  }
}
