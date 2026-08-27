import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { operationalRequestSchema } from "@/lib/validations/operational-request.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

// GET/POST: owner+staff — reporting/reading "faltan elementos de limpieza"-
// style needs is a floor-level action for staff in general (T-20260826-010),
// not restricted to a specific staffCategory/department (that axis is
// T-20260826-014, not implemented yet and not asked for here). Most recent
// first — a small operational list, not a paginated log.
export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const rows = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .select({
          id: schema.operationalRequests.id,
          description: schema.operationalRequests.description,
          category: schema.operationalRequests.category,
          status: schema.operationalRequests.status,
          createdAt: schema.operationalRequests.createdAt,
          reportedByUserId: schema.operationalRequests.reportedByUserId,
          reportedByFirstName: schema.users.firstName,
          reportedByLastName: schema.users.lastName,
        })
        .from(schema.operationalRequests)
        .innerJoin(schema.users, eq(schema.users.id, schema.operationalRequests.reportedByUserId))
        .orderBy(desc(schema.operationalRequests.createdAt)),
    );

    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = operationalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const created = await withTenantContext(context.tenantId, context.role, async (tx) => {
      // context.userId is the Supabase Auth user id (x-user-id header), not
      // this tenant's local `users.id` row that reportedByUserId's FK
      // targets — same distinction users.ts's docstring draws between
      // `authUserId` and `id` (mirrors the lookup in
      // app/api/v1/memberships/[id]/send-reminder/route.ts).
      const [actingUser] = await tx
        .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.authUserId, context.userId));

      if (!actingUser) return null;

      const [row] = await tx
        .insert(schema.operationalRequests)
        .values({
          tenantId: context.tenantId,
          reportedByUserId: actingUser.id,
          description: parsed.data.description,
          category: parsed.data.category,
        })
        .returning();

      // Reuse actingUser's already-fetched name instead of a second joined
      // query — same response shape as GET's rows (reportedByFirstName/
      // LastName) so the UI can prepend this straight into its list.
      return {
        ...row,
        reportedByFirstName: actingUser.firstName,
        reportedByLastName: actingUser.lastName,
      };
    });

    if (!created) {
      return NextResponse.json(
        { error: "No se pudo identificar al usuario que reporta" },
        { status: 409 },
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
