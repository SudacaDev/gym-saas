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
import { getCurrentEffectiveStatus } from "@/lib/memberships/status";
import type { MembershipStatus } from "@/lib/memberships/status";
import { generateShortCode } from "@/lib/members/generate-short-code";

/**
 * Proves the one gate that makes manual check-in actually enforce
 * something: a check-in is only ever inserted when the member's current
 * membership (see lib/memberships/status.ts's getCurrentEffectiveStatus)
 * is effectively "active" — never for a member with no membership at all,
 * or one that's paused/cancelled/expired.
 *
 * This mirrors exactly what app/api/v1/checkins/route.ts's POST handler
 * does (select the member's memberships, compute effective status, only
 * then insert) rather than calling the route handler itself — same
 * rationale as member-soft-delete.test.ts / payment-extends-membership.test.ts:
 * route handlers depend on next/server's request/headers plumbing that
 * isn't available outside a real request, so this exercises the DB-level
 * operation the handler performs.
 *
 * Skipped without DATABASE_URL, same as every other DB-backed suite here.
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "manual check-in requires an active membership",
  () => {
    let tenant: { id: string };

    beforeAll(async () => {
      const db = getDb();
      const [t] = await db
        .insert(schema.tenants)
        .values({ name: `Checkin gate test ${randomUUID()}` })
        .returning({ id: schema.tenants.id });
      tenant = t;
    });

    afterAll(async () => {
      const db = getDb();
      await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
    });

    // Mirrors app/api/v1/checkins/route.ts's POST handler: select the
    // member's memberships inside the tenant-scoped transaction, gate on
    // getCurrentEffectiveStatus, only insert into checkins when "active".
    async function attemptCheckin(memberId: string) {
      return withTenantContext(tenant.id, "owner", async (tx) => {
        const memberships = await tx
          .select({
            status: schema.memberships.status,
            startDate: schema.memberships.startDate,
            endDate: schema.memberships.endDate,
            createdAt: schema.memberships.createdAt,
          })
          .from(schema.memberships)
          .where(eq(schema.memberships.memberId, memberId));

        const effective = getCurrentEffectiveStatus(memberships);
        if (effective !== "active") {
          return { inserted: false as const, effective };
        }

        const [checkin] = await tx
          .insert(schema.checkins)
          .values({ tenantId: tenant.id, memberId, method: "manual" })
          .returning();

        return { inserted: true as const, effective, checkin };
      });
    }

    async function createMember(label: string) {
      const [member] = await withTenantContext(tenant.id, "owner", (tx) =>
        tx
          .insert(schema.members)
          .values({
            tenantId: tenant.id,
            shortCode: generateShortCode(),
            firstName: label,
            lastName: "Test",
          })
          .returning({ id: schema.members.id }),
      );
      return member.id;
    }

    async function createPlan() {
      const [plan] = await withTenantContext(tenant.id, "owner", (tx) =>
        tx
          .insert(schema.plans)
          .values({ tenantId: tenant.id, name: "Mensual", price: "1000.00", period: "monthly" })
          .returning({ id: schema.plans.id }),
      );
      return plan.id;
    }

    it("un socio sin ninguna membresía no puede hacer check-in", async () => {
      const memberId = await createMember("SinMembresia");

      const result = await attemptCheckin(memberId);

      expect(result.inserted).toBe(false);
      expect(result.effective).toBe("none");

      const checkins = await withTenantContext(tenant.id, "owner", (tx) =>
        tx.select().from(schema.checkins).where(eq(schema.checkins.memberId, memberId)),
      );
      expect(checkins).toHaveLength(0);
    });

    it.each<{ label: string; status: MembershipStatus; startDate: string; endDate: string | null }>([
      { label: "Pausada", status: "paused", startDate: "2026-06-01", endDate: "2026-07-01" },
      { label: "Cancelada", status: "cancelled", startDate: "2026-06-01", endDate: "2026-07-01" },
      { label: "Vencida", status: "active", startDate: "2026-01-01", endDate: "2026-02-01" },
    ])(
      "un socio con membresía $label no puede hacer check-in",
      async ({ label, status, startDate, endDate }) => {
        const memberId = await createMember(label);
        const planId = await createPlan();

        await withTenantContext(tenant.id, "owner", (tx) =>
          tx.insert(schema.memberships).values({
            tenantId: tenant.id,
            memberId,
            planId,
            status,
            startDate,
            endDate,
          }),
        );

        const result = await attemptCheckin(memberId);

        expect(result.inserted).toBe(false);

        const checkins = await withTenantContext(tenant.id, "owner", (tx) =>
          tx.select().from(schema.checkins).where(eq(schema.checkins.memberId, memberId)),
        );
        expect(checkins).toHaveLength(0);
      },
    );

    it("un socio con membresía activa vigente sí puede hacer check-in", async () => {
      const memberId = await createMember("Activa");
      const planId = await createPlan();

      await withTenantContext(tenant.id, "owner", (tx) =>
        tx.insert(schema.memberships).values({
          tenantId: tenant.id,
          memberId,
          planId,
          status: "active",
          startDate: "2026-06-01",
          endDate: "2026-12-01",
        }),
      );

      const result = await attemptCheckin(memberId);

      expect(result.inserted).toBe(true);
      expect(result.effective).toBe("active");

      const checkins = await withTenantContext(tenant.id, "owner", (tx) =>
        tx.select().from(schema.checkins).where(eq(schema.checkins.memberId, memberId)),
      );
      expect(checkins).toHaveLength(1);
      expect(checkins[0].method).toBe("manual");
    });
  },
);
