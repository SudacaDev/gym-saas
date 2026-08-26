import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { sendAndLogReminder } from "@/lib/reminders/send-and-log-reminder";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/v1/memberships/[id]/send-reminder — owner/staff can trigger a
// one-off membership-reminder email on demand (e.g. a socio calls asking
// "when does my membership expire", or staff wants to nudge someone ahead
// of the automatic cron). Deliberately ignores `members.emailOptOut`: that
// flag only opts a member out of the *automatic* reminder — see its
// docstring in db/schema/members.ts — a manual send is staff acting on a
// specific, in-the-moment decision, not the bulk automatic sweep the
// opt-out exists to protect against.
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const result = await withTenantContext(
      context.tenantId,
      context.role,
      async (tx) => {
        const [membership] = await tx
          .select({
            id: schema.memberships.id,
            memberId: schema.memberships.memberId,
            planId: schema.memberships.planId,
            endDate: schema.memberships.endDate,
          })
          .from(schema.memberships)
          .where(eq(schema.memberships.id, id));

        if (!membership || !membership.endDate) {
          return null;
        }

        const [member] = await tx
          .select({
            id: schema.members.id,
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
          })
          .from(schema.members)
          .where(eq(schema.members.id, membership.memberId));

        const [plan] = await tx
          .select({ name: schema.plans.name })
          .from(schema.plans)
          .where(eq(schema.plans.id, membership.planId));

        const [tenant] = await tx
          .select({ name: schema.tenants.name })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, context.tenantId));

        if (!member || !plan) {
          return null;
        }

        // context.userId is the Supabase Auth user id (x-user-id header),
        // not this tenant's local `users.id` row that emailSendLog's FK
        // targets — same distinction users.ts's docstring draws between
        // `authUserId` and `id`. Resolve the local row so the log can
        // actually join to a name/email later.
        const [actingUser] = await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.authUserId, context.userId));

        const outcome = await sendAndLogReminder({
          tx,
          tenantId: context.tenantId,
          tenantName: tenant?.name ?? "",
          member,
          membershipId: membership.id,
          planName: plan.name,
          endDate: membership.endDate,
          type: "manual",
          triggeredByUserId: actingUser?.id ?? null,
          reminderScheduledFor: null,
        });

        return outcome;
      },
    );

    if (!result) {
      return NextResponse.json(
        { error: "Membresía no encontrada o sin fecha de vencimiento" },
        { status: 404 },
      );
    }

    if (result.outcome === "failed") {
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    return NextResponse.json({ outcome: result.outcome });
  } catch (error) {
    return handleApiError(error);
  }
}
