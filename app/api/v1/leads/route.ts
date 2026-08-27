import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { leadSchema } from "@/lib/validations/lead.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

// Owner+staff both — capturing/reviewing a prospect is a front-desk
// operation, same tier as checkins/schedules/kiosk. Newest first: this is
// an operational "who do I need to follow up with" list, not a report.
export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const leads = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)),
    );

    return NextResponse.json(leads);
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner+staff — whoever is at the counter when a prospect walks in logs
// them. `status` is never taken from the client: every new lead starts
// "nuevo" (see db/schema/leads.ts); moving it forward is PATCH
// /api/v1/leads/[id].
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const [lead] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .insert(schema.leads)
        .values({
          tenantId: context.tenantId,
          name: parsed.data.name,
          whatsapp: parsed.data.whatsapp,
          note: parsed.data.note || null,
        })
        .returning(),
    );

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
