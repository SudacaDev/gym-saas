import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { handleApiError } from "@/lib/api/handle-api-error";

// GET /api/v1/email-send-log?memberId=... — read-only history of
// reminder-email attempts (automatic + manual) for one member, most recent
// first. Same owner+staff roles as the rest of the member detail page:
// per the permission model agreed for T-20260824-003, staff can see the
// log even though only owner can be the one connecting/configuring
// anything upstream of it.
export async function GET(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const memberId = new URL(request.url).searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId es requerido" },
        { status: 400 },
      );
    }

    const log = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .select()
        .from(schema.emailSendLog)
        .where(eq(schema.emailSendLog.memberId, memberId))
        .orderBy(desc(schema.emailSendLog.createdAt)),
    );

    return NextResponse.json(log);
  } catch (error) {
    return handleApiError(error);
  }
}
