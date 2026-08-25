import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { checkinSelfSchema } from "@/lib/validations/checkin.schema";
import { getCurrentEffectiveStatus } from "@/lib/memberships/status";
import { handleApiError } from "@/lib/api/handle-api-error";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit/fixed-window-limiter";

// 5 wrong codes per minute (confirmed with the user, T-20260825-004) — see
// lib/rate-limit/fixed-window-limiter.ts's docstring for the in-memory
// caveat (best-effort under multiple concurrent serverless instances, full
// protection on the single-warm-instance case this app runs today).
const SELF_CHECKIN_RATE_LIMIT = { max: 5, windowMs: 60_000 };

// Registers a self-service check-in from the front-desk screen
// (T-20260825-004): a member types their own 6-digit `checkinCode`
// instead of staff finding them by name/short code and tapping
// "Check-in". Scope decision (see the gate file for the full writeup):
// this is deliberately NOT a public/unauthenticated kiosk route — it's a
// new input mode on the same authenticated staff/owner check-in session
// as POST /api/v1/checkins, gated by the same requireRole and resolving
// the tenant from that same session. If a public unauthenticated kiosk
// (nobody logged in at the front door) was actually the intent, that's a
// materially bigger, riskier build — a different security review, not
// this endpoint.
//
// Rate limiting only counts *wrong* codes (code not found for this
// tenant) against the budget — a legitimate member typing their own
// correct code, even repeatedly across many different members at a busy
// front desk, never trips the limiter. See fixed-window-limiter.ts.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = checkinSelfSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    // Keyed by tenant + the authenticated staff/owner session (userId),
    // not by IP: this route always runs behind requireRole with a real
    // session (unlike a public kiosk, where IP would be the only signal
    // available), and userId is reliably present regardless of proxy
    // header configuration — see get-tenant-context.ts.
    const rateLimitKey = `${context.tenantId}:${context.userId}`;
    const status = checkRateLimit(rateLimitKey, SELF_CHECKIN_RATE_LIMIT);
    if (status.limited) {
      return NextResponse.json(
        { error: "Demasiados intentos con código inválido. Esperá un minuto e intentá de nuevo." },
        { status: 429 },
      );
    }

    const result = await withTenantContext(
      context.tenantId,
      context.role,
      async (tx) => {
        const [member] = await tx
          .select()
          .from(schema.members)
          .where(
            and(
              eq(schema.members.checkinCode, parsed.data.code),
              isNull(schema.members.deletedAt),
            ),
          );

        if (!member) {
          return "code_not_found" as const;
        }

        const memberships = await tx
          .select({
            status: schema.memberships.status,
            startDate: schema.memberships.startDate,
            endDate: schema.memberships.endDate,
            createdAt: schema.memberships.createdAt,
          })
          .from(schema.memberships)
          .where(eq(schema.memberships.memberId, member.id));

        const effective = getCurrentEffectiveStatus(memberships);
        if (effective !== "active") {
          return { kind: "no_active_membership" as const, member };
        }

        const [checkin] = await tx
          .insert(schema.checkins)
          .values({
            tenantId: context.tenantId,
            memberId: member.id,
            method: "self_code",
          })
          .returning();

        return { kind: "success" as const, member, checkin };
      },
    );

    if (result === "code_not_found") {
      recordAttempt(rateLimitKey, SELF_CHECKIN_RATE_LIMIT);
      return NextResponse.json({ error: "Código inválido" }, { status: 404 });
    }

    if (result.kind === "no_active_membership") {
      return NextResponse.json(
        {
          error: "El socio no tiene una membresía activa",
          member: result.member,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { member: result.member, checkin: result.checkin },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
