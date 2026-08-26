import { NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, lt, type SQL } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { checkinCreateSchema } from "@/lib/validations/checkin.schema";
import { getCurrentEffectiveStatus } from "@/lib/memberships/status";
import { handleApiError } from "@/lib/api/handle-api-error";

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// GET /api/v1/checkins?memberId=... — a member's check-in history, most
// recent first, for the member detail page. Same roles as members/
// memberships: staff runs the front desk too. memberId is optional (unlike
// memberships/payments' required ?memberId=) so this same handler could
// later back a tenant-wide "recent activity" view without a second route.
//
// ?open=true — instead scopes to today's check-ins with no check-out yet
// ("who's in the gym right now"), for the check-in page's live panel.
// Bounded to today so this stays a small, fast query regardless of how
// much check-in history a tenant accumulates over time.
export async function GET(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");
    const openOnly = url.searchParams.get("open") === "true";

    const conditions: SQL[] = [];
    if (memberId) conditions.push(eq(schema.checkins.memberId, memberId));
    if (openOnly) {
      const todayStart = startOfDayUTC(new Date());
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      conditions.push(isNull(schema.checkins.checkedOutAt));
      conditions.push(gte(schema.checkins.timestamp, todayStart));
      conditions.push(lt(schema.checkins.timestamp, tomorrowStart));
    }

    const checkins = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .select()
          .from(schema.checkins)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(schema.checkins.timestamp)),
    );

    return NextResponse.json(checkins);
  } catch (error) {
    return handleApiError(error);
  }
}

// Registers a manual check-in from the front desk (POST /api/v1/checkins).
// `method` is always "manual" here — see checkin.schema.ts's docstring —
// QR/NFC are out of scope until members have their own login.
//
// Before inserting, requires the member's current membership (see
// lib/memberships/status.ts) to be effectively "active" — a lapsed/paused/
// cancelled/never-had-one member can't be checked in, so staff gets a
// clear signal at the door instead of the app silently letting anyone in.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = checkinCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await withTenantContext(
      context.tenantId,
      context.role,
      async (tx) => {
        const memberships = await tx
          .select({
            status: schema.memberships.status,
            startDate: schema.memberships.startDate,
            endDate: schema.memberships.endDate,
            createdAt: schema.memberships.createdAt,
          })
          .from(schema.memberships)
          .where(eq(schema.memberships.memberId, parsed.data.memberId));

        const effective = getCurrentEffectiveStatus(memberships);
        if (effective !== "active") {
          return "no_active_membership" as const;
        }

        const [checkin] = await tx
          .insert(schema.checkins)
          .values({
            tenantId: context.tenantId,
            memberId: parsed.data.memberId,
            method: "manual",
          })
          .returning();

        return checkin;
      },
    );

    if (result === "no_active_membership") {
      return NextResponse.json(
        { error: "El socio no tiene una membresía activa" },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
