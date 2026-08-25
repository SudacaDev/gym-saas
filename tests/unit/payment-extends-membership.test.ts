import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Standalone test run (not through Next.js) — pick up DATABASE_URL from
// .env.local if present, without overriding a real env var (CI etc), same
// as tests/unit/member-soft-delete.test.ts.
loadEnv({ path: join(__dirname, "..", "..", ".env.local") });

import { getDb, schema } from "@/db/client";
import { withTenantContext } from "@/db/rls-context";
import { computeRenewedEndDate } from "@/lib/memberships/renewal";

/**
 * Proves the one thing that makes Phase 2 actually useful: registering a
 * `paid` payment against a membership extends that membership's endDate by
 * its plan's period — end to end through the real DB (date column
 * round-tripping included), not just the pure lib/memberships/renewal.ts
 * math in isolation (that's covered by
 * tests/unit/membership-renewal.test.ts).
 *
 * This mirrors exactly what app/api/v1/payments/route.ts's POST handler
 * does (select membership + plan, insert payment, update endDate) rather
 * than calling the route handler itself — same rationale as
 * member-soft-delete.test.ts: route handlers depend on next/server's
 * request/headers plumbing that isn't available outside a real request,
 * so these tests exercise the DB-level operations the handler performs.
 *
 * Skipped without DATABASE_URL, same as every other DB-backed suite here.
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "registering a paid payment extends the membership endDate",
  () => {
    let tenant: { id: string };

    beforeAll(async () => {
      const db = getDb();
      const [t] = await db
        .insert(schema.tenants)
        .values({ name: `Payment renewal test ${randomUUID()}` })
        .returning({ id: schema.tenants.id });
      tenant = t;
    });

    afterAll(async () => {
      const db = getDb();
      await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
    });

    it("extiende endDate según la periodicidad del plan al registrar un pago paid", async () => {
      const { membershipId } = await withTenantContext(
        tenant.id,
        "owner",
        async (tx) => {
          const [member] = await tx
            .insert(schema.members)
            .values({
              tenantId: tenant.id,
              shortCode: "PY01TT",
              firstName: "Pay",
              lastName: "Test",
            })
            .returning({ id: schema.members.id });

          const [plan] = await tx
            .insert(schema.plans)
            .values({
              tenantId: tenant.id,
              name: "Mensual",
              price: "1000.00",
              period: "monthly",
            })
            .returning({ id: schema.plans.id });

          const [membership] = await tx
            .insert(schema.memberships)
            .values({
              tenantId: tenant.id,
              memberId: member.id,
              planId: plan.id,
              status: "active",
              startDate: "2026-06-01",
              endDate: "2026-07-01",
            })
            .returning({ id: schema.memberships.id });

          return { membershipId: membership.id };
        },
      );

      // Same sequence as app/api/v1/payments/route.ts's POST handler.
      const today = new Date("2026-06-15T00:00:00Z");
      await withTenantContext(tenant.id, "owner", async (tx) => {
        const [membership] = await tx
          .select({
            id: schema.memberships.id,
            memberId: schema.memberships.memberId,
            endDate: schema.memberships.endDate,
            planId: schema.memberships.planId,
          })
          .from(schema.memberships)
          .where(eq(schema.memberships.id, membershipId));

        const [plan] = await tx
          .select({ period: schema.plans.period })
          .from(schema.plans)
          .where(eq(schema.plans.id, membership.planId));

        await tx.insert(schema.payments).values({
          tenantId: tenant.id,
          memberId: membership.memberId,
          membershipId: membership.id,
          amount: "1000.00",
          status: "paid",
        });

        await tx
          .update(schema.memberships)
          .set({
            endDate: computeRenewedEndDate(membership.endDate, plan.period, today),
          })
          .where(eq(schema.memberships.id, membership.id));
      });

      const [updated] = await withTenantContext(tenant.id, "owner", (tx) =>
        tx
          .select({ endDate: schema.memberships.endDate })
          .from(schema.memberships)
          .where(eq(schema.memberships.id, membershipId)),
      );

      // endDate was 2026-07-01 (still in the future relative to `today` =
      // 2026-06-15), so the monthly renewal extends FROM that endDate, not
      // from today: 2026-07-01 + 1 month = 2026-08-01.
      expect(updated.endDate).toBe("2026-08-01");

      const payments = await withTenantContext(tenant.id, "owner", (tx) =>
        tx
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.membershipId, membershipId)),
      );
      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe("paid");
      expect(payments[0].gatewayRef).toBeNull();
    });
  },
);
