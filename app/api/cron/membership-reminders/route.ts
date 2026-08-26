import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { withTenantContext } from "@/db/rls-context";
import { isDueForReminder } from "@/lib/reminders/reminder-window";
import { sendAndLogReminder } from "@/lib/reminders/send-and-log-reminder";

/**
 * GET /api/cron/membership-reminders — meant to be hit once a day by
 * Vercel Cron (see vercel.json), never by a browser or a regular
 * authenticated user. Auth is a shared secret (CRON_SECRET), not
 * getTenantContext()/requireRole() — there's no signed-in user or single
 * tenant here, this runs across every tenant in one pass.
 *
 * Uses getDb() (the RLS-bypassing trusted role) only to list tenants —
 * the same "list everything, no tenant to scope by yet" case
 * db/client.ts's docstring calls out for onboarding. Every actual read/
 * write of business data (memberships, members, the log) still goes
 * through withTenantContext per tenant, so RLS is never actually bypassed
 * for tenant data — only for the outer "which tenants exist" query.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      "CRON_SECRET is not set — refusing to run the reminder cron. " +
        "Copy .env.local.example to .env.local and set one.",
    );
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await getDb()
    .select({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.tenants);

  const results: Array<{
    tenantId: string;
    sent: number;
    failed: number;
    skippedOptOut: number;
  }> = [];

  for (const tenant of tenants) {
    const tenantResult = await withTenantContext(
      tenant.id,
      "owner",
      async (tx) => {
        const dueCandidates = await tx
          .select({
            membershipId: schema.memberships.id,
            planId: schema.memberships.planId,
            endDate: schema.memberships.endDate,
            memberId: schema.members.id,
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
            emailOptOut: schema.members.emailOptOut,
          })
          .from(schema.memberships)
          .innerJoin(
            schema.members,
            eq(schema.memberships.memberId, schema.members.id),
          )
          .where(
            and(
              eq(schema.memberships.status, "active"),
              isNotNull(schema.memberships.endDate),
            ),
          );

        let sent = 0;
        let failed = 0;
        let skippedOptOut = 0;

        for (const row of dueCandidates) {
          if (!row.endDate || !isDueForReminder(row.endDate)) continue;

          if (row.emailOptOut) {
            skippedOptOut++;
            continue;
          }

          const [plan] = await tx
            .select({ name: schema.plans.name })
            .from(schema.plans)
            .where(eq(schema.plans.id, row.planId));
          if (!plan) continue;

          const outcome = await sendAndLogReminder({
            tx,
            tenantId: tenant.id,
            tenantName: tenant.name,
            member: {
              id: row.memberId,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
            },
            membershipId: row.membershipId,
            planName: plan.name,
            endDate: row.endDate,
            type: "reminder",
            triggeredByUserId: null,
            reminderScheduledFor: row.endDate,
          });

          if (outcome.outcome === "sent") sent++;
          else if (outcome.outcome === "failed") failed++;
        }

        return { sent, failed, skippedOptOut };
      },
    );

    results.push({ tenantId: tenant.id, ...tenantResult });
  }

  return NextResponse.json({ results });
}
