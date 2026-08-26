import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Registers the checkout for an existing check-in (PATCH
// /api/v1/checkins/[id]) — sets checkedOutAt to now. No request body: this
// is a single action, not a field update. The WHERE also requires
// checkedOutAt to still be null, so a second call (double-click, stale tab)
// is a no-op 404 instead of silently overwriting the real checkout time.
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const [checkin] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .update(schema.checkins)
          .set({ checkedOutAt: new Date() })
          .where(and(eq(schema.checkins.id, id), isNull(schema.checkins.checkedOutAt)))
          .returning(),
    );

    if (!checkin) {
      return NextResponse.json(
        { error: "Check-in no encontrado o ya tiene check-out registrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(checkin);
  } catch (error) {
    return handleApiError(error);
  }
}
