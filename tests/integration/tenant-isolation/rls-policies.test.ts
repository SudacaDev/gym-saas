import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Standalone test run (not through Next.js) — pick up DATABASE_URL from
// .env.local if present, without overriding a real env var (CI etc).
loadEnv({ path: join(__dirname, "..", "..", "..", ".env.local") });

import { getDb, getScopedDb, schema } from "@/db/client";
import { withTenantContext } from "@/db/rls-context";
import { generateShortCode } from "@/lib/members/generate-short-code";

/**
 * Proves the RLS policies in db/policies/ actually isolate tenants at the
 * database level — not just "the app's WHERE clause happens to filter
 * correctly". Seeds two tenants with one row in every business table,
 * then — using withTenantContext scoped to tenant A only — tries several
 * ways to see or touch tenant B's rows, all of which must fail:
 *   - a plain `SELECT *` (no WHERE at all)
 *   - a `SELECT ... WHERE` that explicitly names tenant B's row id
 *   - a raw `OR true` filter, to show RLS isn't just AND-ed app-side but
 *     enforced independently of whatever the query itself filters on
 *   - an INSERT/UPDATE that tries to stamp a row as belonging to tenant B
 *     while running under tenant A's context (WITH CHECK must reject it)
 *
 * Skipped entirely when there's no DATABASE_URL — this suite needs a real
 * Postgres with migrations + db/policies/ already applied (`npm run
 * db:migrate` against DATABASE_URL) to mean anything. It will start
 * running automatically the moment DATABASE_URL is configured, with no
 * other change needed.
 */
describe.skipIf(!process.env.DATABASE_URL)("RLS tenant isolation", () => {
  // NOTE: getDb() is called lazily inside hooks/tests below, never at this
  // top level — describe.skipIf still *executes* this factory function to
  // collect the suite even when skipped, it only skips running the
  // hooks/tests themselves. Calling getDb() up here would throw (no
  // DATABASE_URL) even when this whole suite is meant to be a no-op.
  let tenantA: { id: string };
  let tenantB: { id: string };
  const seeded: Record<
    "A" | "B",
    {
      userId: string;
      planId: string;
      memberId: string;
      membershipId: string;
      paymentId: string;
      checkinId: string;
      classScheduleId: string;
      activityId: string;
    }
  > = {} as never;

  async function seedTenant(tenantId: string, tag: string) {
    return withTenantContext(tenantId, "owner", async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          tenantId,
          authUserId: randomUUID(),
          role: "owner",
          email: `owner-${tag}@example.test`,
        })
        .returning({ id: schema.users.id });

      const [plan] = await tx
        .insert(schema.plans)
        .values({
          tenantId,
          name: `Plan ${tag}`,
          price: "1000.00",
          period: "monthly",
        })
        .returning({ id: schema.plans.id });

      const [member] = await tx
        .insert(schema.members)
        .values({
          tenantId,
          shortCode: generateShortCode(),
          firstName: `Member`,
          lastName: tag,
          email: `member-${tag}@example.test`,
        })
        .returning({ id: schema.members.id });

      const [membership] = await tx
        .insert(schema.memberships)
        .values({
          tenantId,
          memberId: member.id,
          planId: plan.id,
          status: "active",
          startDate: "2026-01-01",
        })
        .returning({ id: schema.memberships.id });

      const [payment] = await tx
        .insert(schema.payments)
        .values({
          tenantId,
          memberId: member.id,
          membershipId: membership.id,
          amount: "1000.00",
          status: "paid",
          gatewayRef: `gw_${tag}_${randomUUID()}`,
        })
        .returning({ id: schema.payments.id });

      const [checkin] = await tx
        .insert(schema.checkins)
        .values({ tenantId, memberId: member.id, method: "manual" })
        .returning({ id: schema.checkins.id });

      const [activity] = await tx
        .insert(schema.activities)
        .values({ tenantId, name: `Actividad ${tag}` })
        .returning({ id: schema.activities.id });

      const [classSchedule] = await tx
        .insert(schema.classSchedules)
        .values({
          tenantId,
          dayOfWeek: "monday",
          startTime: "18:00",
          endTime: "19:00",
          activityId: activity.id,
        })
        .returning({ id: schema.classSchedules.id });

      return {
        userId: user.id,
        planId: plan.id,
        memberId: member.id,
        membershipId: membership.id,
        paymentId: payment.id,
        checkinId: checkin.id,
        classScheduleId: classSchedule.id,
        activityId: activity.id,
      };
    });
  }

  beforeAll(async () => {
    const db = getDb();
    const suffix = randomUUID();
    const [a] = await db
      .insert(schema.tenants)
      .values({ name: `Tenant A ${suffix}` })
      .returning({ id: schema.tenants.id });
    const [b] = await db
      .insert(schema.tenants)
      .values({ name: `Tenant B ${suffix}` })
      .returning({ id: schema.tenants.id });

    tenantA = a;
    tenantB = b;

    seeded.A = await seedTenant(tenantA.id, "a");
    seeded.B = await seedTenant(tenantB.id, "b");
  });

  afterAll(async () => {
    // tenants has no RLS (see db/policies/README.md); tenantId FKs cascade
    // this out of every business table.
    const db = getDb();
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantA.id));
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantB.id));
  });

  /**
   * Runs `SELECT tenant_id FROM <table>` as raw SQL (sidesteps needing a
   * per-table Drizzle type) under tenant A's context and asserts every row
   * belongs to tenant A, and that at least one row came back (i.e. this
   * isn't vacuously true because the query returned nothing at all).
   */
  async function assertOnlySeesOwnTenant(tableName: string) {
    const rows = (await withTenantContext(tenantA.id, "owner", (tx) =>
      tx.execute(sql.raw(`select tenant_id from ${tableName}`)),
    )) as unknown as { tenant_id: string }[];

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.tenant_id).toBe(tenantA.id);
    }
  }

  it("SELECT on users never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("users"));
  it("SELECT on members never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("members"));
  it("SELECT on plans never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("plans"));
  it("SELECT on memberships never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("memberships"));
  it("SELECT on payments never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("payments"));
  it("SELECT on checkins never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("checkins"));
  it("SELECT on class_schedules never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("class_schedules"));
  it("SELECT on activities never returns another tenant's rows", () =>
    assertOnlySeesOwnTenant("activities"));

  it("an explicit WHERE naming tenant B's row id still returns nothing under tenant A's context", async () => {
    const rows = await withTenantContext(tenantA.id, "owner", (tx) =>
      tx
        .select()
        .from(schema.members)
        .where(eq(schema.members.id, seeded.B.memberId)),
    );
    expect(rows).toHaveLength(0);
  });

  it("a raw 'OR true' filter does not defeat RLS", async () => {
    // RLS's USING clause is enforced independently of, not merged into,
    // whatever WHERE the query itself specifies — a query trying to
    // "trick" its way past a naive app-level filter gains nothing here.
    const rows = await withTenantContext(tenantA.id, "owner", (tx) =>
      tx.execute(
        sql`select * from members where tenant_id = ${tenantB.id}::uuid or true`,
      ),
    );
    for (const row of rows as unknown as { tenant_id: string }[]) {
      expect(row.tenant_id).toBe(tenantA.id);
    }
  });

  it("a raw query with no WHERE at all still only sees the current tenant's rows", async () => {
    const rows = await withTenantContext(tenantA.id, "owner", (tx) =>
      tx.execute(sql`select tenant_id from payments`),
    );
    for (const row of rows as unknown as { tenant_id: string }[]) {
      expect(row.tenant_id).toBe(tenantA.id);
    }
  });

  it("WITH CHECK rejects inserting a row stamped as another tenant", async () => {
    await expect(
      withTenantContext(tenantA.id, "owner", (tx) =>
        tx.insert(schema.members).values({
          tenantId: tenantB.id, // <- claims to belong to tenant B
          shortCode: generateShortCode(),
          firstName: "Sneaky",
          lastName: "Insert",
        }),
      ),
    ).rejects.toThrow();
  });

  it("WITH CHECK rejects re-stamping an existing row onto another tenant", async () => {
    await expect(
      withTenantContext(tenantA.id, "owner", (tx) =>
        tx
          .update(schema.members)
          .set({ tenantId: tenantB.id })
          .where(eq(schema.members.id, seeded.A.memberId)),
      ),
    ).rejects.toThrow();
  });

  it("querying without any tenant context set (scoped client, app_user role) returns no business rows", async () => {
    // getScopedDb() (app_user — the role RLS actually applies to) never
    // ran set_config here, so app.current_tenant_id is NULL for this
    // connection's transaction -> `tenant_id = NULL::uuid` is never true
    // -> fail closed, not open. (Deliberately NOT using getDb(): that's
    // the trusted/bypassing role and would trivially return the row
    // regardless of context, which would prove nothing.)
    const rows = await getScopedDb()
      .select()
      .from(schema.members)
      .where(eq(schema.members.id, seeded.A.memberId));
    expect(rows).toHaveLength(0);
  });

  it("the trusted role (getDb()) bypasses RLS entirely, by design — never use it for tenant-scoped queries", async () => {
    // This is a guard against regressions in the OTHER direction: if this
    // ever starts returning 0 rows, either Supabase's role setup changed
    // or DATABASE_TRUSTED_URL got pointed at a non-bypassing role — either
    // way, scripts/setup-app-role.ts's assumptions need re-checking.
    const rows = await getDb()
      .select()
      .from(schema.members)
      .where(eq(schema.members.id, seeded.A.memberId));
    expect(rows).toHaveLength(1);
  });
});
