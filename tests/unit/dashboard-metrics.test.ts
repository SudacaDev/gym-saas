import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Standalone test run (not through Next.js) — pick up DATABASE_URL from
// .env.local if present, without overriding a real env var (CI etc), same
// as tests/unit/payment-extends-membership.test.ts.
loadEnv({ path: join(__dirname, "..", "..", ".env.local") });

import { getDb, schema } from "@/db/client";
import { withTenantContext } from "@/db/rls-context";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { generateShortCode } from "@/lib/members/generate-short-code";

/**
 * Proves app/(owner)/dashboard's 4 headline metrics against known, seeded
 * data through the real DB — same rationale as the other DB-backed suites
 * here: this exercises lib/dashboard/metrics.ts's getDashboardMetrics()
 * directly (what the Server Component calls), not the page component
 * itself, since rendering a Server Component isn't something these
 * lightweight vitest suites are set up to do.
 *
 * `now` is captured once and reused both to seed relative dates (so the
 * suite isn't flaky around real month/day boundaries) and as the `now`
 * passed into getDashboardMetrics, so "this month"/"today"/"in 7 days"
 * resolve consistently between seed and assertion regardless of when the
 * suite actually runs.
 *
 * Skipped without DATABASE_URL, same as every other DB-backed suite here.
 */
describe.skipIf(!process.env.DATABASE_URL)("dashboard metrics", () => {
  let tenant: { id: string };
  const now = new Date();

  function addDays(date: Date, days: number): string {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  beforeAll(async () => {
    const db = getDb();
    const [t] = await db
      .insert(schema.tenants)
      .values({ name: `Dashboard metrics test ${randomUUID()}` })
      .returning({ id: schema.tenants.id });
    tenant = t;

    await withTenantContext(tenant.id, "owner", async (tx) => {
      const [plan] = await tx
        .insert(schema.plans)
        .values({
          tenantId: tenant.id,
          name: "Mensual",
          price: "1000.00",
          period: "monthly",
        })
        .returning({ id: schema.plans.id });

      // Socio activo cuya membresía vence en 3 días: cuenta como "socio
      // activo" (todavía no venció) Y como "vence en 7 días".
      const [expiringMember] = await tx
        .insert(schema.members)
        .values({
          tenantId: tenant.id,
          shortCode: generateShortCode(),
          firstName: "Vence",
          lastName: "Pronto",
        })
        .returning({ id: schema.members.id });

      const [expiringMembership] = await tx
        .insert(schema.memberships)
        .values({
          tenantId: tenant.id,
          memberId: expiringMember.id,
          planId: plan.id,
          status: "active",
          startDate: addDays(now, -27),
          endDate: addDays(now, 3),
        })
        .returning({ id: schema.memberships.id });

      // Socio con membresía vencida hace tiempo: no debe contar como socio
      // activo ni como "vence en 7 días".
      const [expiredMember] = await tx
        .insert(schema.members)
        .values({
          tenantId: tenant.id,
          shortCode: generateShortCode(),
          firstName: "Vencido",
          lastName: "Test",
        })
        .returning({ id: schema.members.id });

      await tx.insert(schema.memberships).values({
        tenantId: tenant.id,
        memberId: expiredMember.id,
        planId: plan.id,
        status: "active",
        startDate: addDays(now, -90),
        endDate: addDays(now, -60),
      });

      // Pago "paid" del mes actual — debe sumar a ingresos del mes.
      await tx.insert(schema.payments).values({
        tenantId: tenant.id,
        memberId: expiringMember.id,
        membershipId: expiringMembership.id,
        amount: "1500.00",
        status: "paid",
        createdAt: now,
      });

      // Pago "pending" del mes actual — NO debe sumar a ingresos.
      await tx.insert(schema.payments).values({
        tenantId: tenant.id,
        memberId: expiringMember.id,
        membershipId: expiringMembership.id,
        amount: "999.00",
        status: "pending",
        createdAt: now,
      });

      // Check-in de hoy.
      await tx.insert(schema.checkins).values({
        tenantId: tenant.id,
        memberId: expiringMember.id,
        method: "manual",
        timestamp: now,
      });
    });
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("calcula las 4 métricas del dashboard a partir de datos conocidos", async () => {
    const metrics = await getDashboardMetrics(tenant.id, "owner", now);

    expect(metrics.revenueThisMonth).toBe(1500);
    expect(metrics.activeMembers).toBe(1);
    expect(metrics.expiringIn7Days).toBe(1);
    expect(metrics.checkinsToday).toBe(1);

    expect(metrics.expiringMembers).toHaveLength(1);
    expect(metrics.expiringMembers[0]).toMatchObject({
      memberName: "Vence Pronto",
      planName: "Mensual",
    });

    // 2 members seeded (Vence Pronto, Vencido Test) — totalMembers counts
    // both regardless of membership status, unlike activeMembers.
    expect(metrics.totalMembers).toBe(2);

    // recentActivity mezcla altas, pagos "paid" y check-ins — el pago
    // "pending" del seed no debe aparecer.
    expect(metrics.recentActivity).toHaveLength(4);
    expect(metrics.recentActivity.filter((a) => a.type === "new_member")).toHaveLength(2);
    expect(metrics.recentActivity.filter((a) => a.type === "payment")).toHaveLength(1);
    expect(metrics.recentActivity.filter((a) => a.type === "checkin")).toHaveLength(1);

    const payment = metrics.recentActivity.find((a) => a.type === "payment");
    expect(payment).toMatchObject({ memberName: "Vence Pronto", amount: 1500 });

    // Sin pagos "paid" seedeados el mes pasado — revenueTrendPct debe ser
    // null (no un 0%/Infinity engañoso).
    expect(metrics.revenueTrendPct).toBeNull();

    // 7 días siempre, aunque casi todos estén en cero — solo el check-in de
    // hoy debe contar.
    expect(metrics.checkinsLast7Days).toHaveLength(7);
    expect(metrics.checkinsLast7Days.reduce((sum, d) => sum + d.count, 0)).toBe(1);
    expect(metrics.checkinsLast7Days[6].count).toBe(1);

    // Un solo socio con check-ins este mes.
    expect(metrics.topMembersByCheckins).toEqual([
      { memberId: metrics.expiringMembers[0].memberId, memberName: "Vence Pronto", count: 1 },
    ]);
  });
});
