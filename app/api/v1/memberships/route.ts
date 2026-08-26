import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { membershipCreateSchema } from "@/lib/validations/membership.schema";
import { handleApiError, isForeignKeyViolation } from "@/lib/api/handle-api-error";
import {
  getCurrentEffectiveStatus,
  type EffectiveMembershipStatus,
} from "@/lib/memberships/status";

// GET /api/v1/memberships?memberId=... — a member's full membership
// history (most recent startDate first), for the member detail page.
// Same roles as members: staff signs members up at the front desk too.
//
// GET /api/v1/memberships?statusSummary=true — every member's effective
// status in one query, keyed by memberId. Feeds the check-in page (and
// anything else needing "is this member active" for the whole roster) so
// it doesn't do a ?memberId=... round trip per member. A member with no
// membership rows at all simply has no key in the response — callers
// already default a missing entry to "none" (same as before this existed).
export async function GET(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");
    const statusSummary = url.searchParams.get("statusSummary") === "true";

    if (statusSummary) {
      const rows = await withTenantContext(context.tenantId, context.role, (tx) =>
        tx
          .select({
            memberId: schema.memberships.memberId,
            status: schema.memberships.status,
            startDate: schema.memberships.startDate,
            endDate: schema.memberships.endDate,
            createdAt: schema.memberships.createdAt,
          })
          .from(schema.memberships),
      );

      const byMember = new Map<string, typeof rows>();
      for (const row of rows) {
        const list = byMember.get(row.memberId) ?? [];
        list.push(row);
        byMember.set(row.memberId, list);
      }

      const summary: Record<string, EffectiveMembershipStatus> = {};
      for (const [id, memberships] of byMember) {
        summary[id] = getCurrentEffectiveStatus(memberships);
      }

      return NextResponse.json(summary);
    }

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId es requerido" },
        { status: 400 },
      );
    }

    const memberships = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .select()
          .from(schema.memberships)
          .where(eq(schema.memberships.memberId, memberId))
          .orderBy(
            desc(schema.memberships.startDate),
            desc(schema.memberships.createdAt),
          ),
    );

    return NextResponse.json(memberships);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = membershipCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    // memberId/planId existing and belonging to this tenant is enforced by
    // the FK constraints (memberships.member_id/plan_id) + RLS, not
    // duplicated here — an invalid or cross-tenant id fails the insert
    // with a FK violation, caught below.
    const [membership] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .insert(schema.memberships)
          .values({
            tenantId: context.tenantId,
            memberId: parsed.data.memberId,
            planId: parsed.data.planId,
            startDate: parsed.data.startDate,
            status: "active",
          })
          .returning(),
    );

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        { error: "Socio o plan inválido" },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}
