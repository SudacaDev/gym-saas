import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Standalone test run (not through Next.js) — pick up DATABASE_URL from
// .env.local if present, without overriding a real env var (CI etc), same
// as tests/integration/tenant-isolation/rls-policies.test.ts.
loadEnv({ path: join(__dirname, "..", "..", ".env.local") });

import { getDb, schema } from "@/db/client";
import { withTenantContext } from "@/db/rls-context";
import { generateShortCode } from "@/lib/members/generate-short-code";

/**
 * Phase 1's two DB-level invariants that aren't already covered by
 * tests/integration/tenant-isolation/rls-policies.test.ts (which only
 * proves tenant isolation, not these business rules):
 *
 *  - a soft-deleted member (deletedAt set) is excluded by a query that
 *    filters `deletedAt IS NULL` — the pattern every members route
 *    handler uses instead of a real DELETE.
 *  - deleting a plan that still has a membership referencing it
 *    (memberships.planId has onDelete: "restrict") fails with Postgres
 *    FK violation 23503 — the error app/api/v1/plans/[id]/route.ts's
 *    DELETE handler catches and turns into a 409.
 *
 * Skipped without DATABASE_URL, same rationale as the RLS suite: this
 * needs a real Postgres with migrations applied to mean anything.
 */
describe.skipIf(!process.env.DATABASE_URL)("member soft delete / plan FK restrict", () => {
  let tenant: { id: string };

  beforeAll(async () => {
    const db = getDb();
    const [t] = await db
      .insert(schema.tenants)
      .values({ name: `Soft delete test ${randomUUID()}` })
      .returning({ id: schema.tenants.id });
    tenant = t;
  });

  afterAll(async () => {
    // tenantId FKs cascade this out of every business table (see
    // rls-policies.test.ts's afterAll for the same pattern).
    const db = getDb();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("a member with deletedAt set is excluded by a deletedAt IS NULL query", async () => {
    const { activeId, deletedId } = await withTenantContext(
      tenant.id,
      "owner",
      async (tx) => {
        const [active] = await tx
          .insert(schema.members)
          .values({
            tenantId: tenant.id,
            shortCode: generateShortCode(),
            firstName: "Active",
            lastName: "Member",
          })
          .returning({ id: schema.members.id });

        const [deleted] = await tx
          .insert(schema.members)
          .values({
            tenantId: tenant.id,
            shortCode: generateShortCode(),
            firstName: "Deleted",
            lastName: "Member",
            deletedAt: new Date(),
          })
          .returning({ id: schema.members.id });

        return { activeId: active.id, deletedId: deleted.id };
      },
    );

    const visibleIds = await withTenantContext(tenant.id, "owner", (tx) =>
      tx
        .select({ id: schema.members.id })
        .from(schema.members)
        .where(isNull(schema.members.deletedAt)),
    );

    const ids = visibleIds.map((row) => row.id);
    expect(ids).toContain(activeId);
    expect(ids).not.toContain(deletedId);
  });

  it("deleting a plan with an associated membership fails with FK violation 23503", async () => {
    const { planId } = await withTenantContext(tenant.id, "owner", async (tx) => {
      const [member] = await tx
        .insert(schema.members)
        .values({
          tenantId: tenant.id,
          shortCode: generateShortCode(),
          firstName: "FK",
          lastName: "Test",
        })
        .returning({ id: schema.members.id });

      const [plan] = await tx
        .insert(schema.plans)
        .values({
          tenantId: tenant.id,
          name: "Plan with membership",
          price: "500.00",
          period: "monthly",
        })
        .returning({ id: schema.plans.id });

      await tx.insert(schema.memberships).values({
        tenantId: tenant.id,
        memberId: member.id,
        planId: plan.id,
        status: "active",
        startDate: "2026-01-01",
      });

      return { planId: plan.id };
    });

    // drizzle-orm wraps the driver's error in a DrizzleQueryError — the
    // actual PostgresError (with the SQLSTATE `code`) is its `.cause`, not
    // a top-level property. See lib/api/handle-api-error.ts's
    // isForeignKeyViolation(), which the plans DELETE route uses to catch
    // exactly this and turn it into a 409.
    await expect(
      withTenantContext(tenant.id, "owner", (tx) =>
        tx.delete(schema.plans).where(eq(schema.plans.id, planId)),
      ),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
  });
});
