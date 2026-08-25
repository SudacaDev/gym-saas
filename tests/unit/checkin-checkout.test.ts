import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Standalone test run (not through Next.js) — pick up DATABASE_URL from
// .env.local if present, without overriding a real env var (CI etc), same
// as tests/unit/payment-extends-membership.test.ts.
loadEnv({ path: join(__dirname, "..", "..", ".env.local") });

import { getDb, schema } from "@/db/client";
import { withTenantContext } from "@/db/rls-context";
import { generateShortCode } from "@/lib/members/generate-short-code";

/**
 * Mirrors app/api/v1/checkins/[id]/route.ts's PATCH handler: sets
 * checkedOutAt only on a check-in that doesn't have one yet. Exercised at
 * the DB-operation level rather than through the route handler itself,
 * same rationale as checkin-requires-active-membership.test.ts (route
 * handlers depend on next/server plumbing not available outside a real
 * request).
 *
 * Skipped without DATABASE_URL, same as every other DB-backed suite here.
 */
describe.skipIf(!process.env.DATABASE_URL)("check-out", () => {
  let tenant: { id: string };
  let memberId: string;

  async function attemptCheckout(checkinId: string) {
    return withTenantContext(tenant.id, "owner", (tx) =>
      tx
        .update(schema.checkins)
        .set({ checkedOutAt: new Date() })
        .where(and(eq(schema.checkins.id, checkinId), isNull(schema.checkins.checkedOutAt)))
        .returning(),
    );
  }

  beforeAll(async () => {
    const db = getDb();
    const [t] = await db
      .insert(schema.tenants)
      .values({ name: `Checkout gate test ${randomUUID()}` })
      .returning({ id: schema.tenants.id });
    tenant = t;

    const [member] = await withTenantContext(tenant.id, "owner", (tx) =>
      tx
        .insert(schema.members)
        .values({
          tenantId: tenant.id,
          shortCode: generateShortCode(),
          firstName: "Socio",
          lastName: "Test",
        })
        .returning({ id: schema.members.id }),
    );
    memberId = member.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
  });

  it("un check-in abierto se puede cerrar una vez", async () => {
    const [checkin] = await withTenantContext(tenant.id, "owner", (tx) =>
      tx
        .insert(schema.checkins)
        .values({ tenantId: tenant.id, memberId, method: "manual" })
        .returning(),
    );
    expect(checkin.checkedOutAt).toBeNull();

    const result = await attemptCheckout(checkin.id);

    expect(result).toHaveLength(1);
    expect(result[0].checkedOutAt).not.toBeNull();
  });

  it("un check-in ya cerrado no se puede volver a cerrar", async () => {
    const [checkin] = await withTenantContext(tenant.id, "owner", (tx) =>
      tx
        .insert(schema.checkins)
        .values({ tenantId: tenant.id, memberId, method: "manual" })
        .returning(),
    );
    await attemptCheckout(checkin.id);

    const secondAttempt = await attemptCheckout(checkin.id);

    expect(secondAttempt).toHaveLength(0);
  });
});
