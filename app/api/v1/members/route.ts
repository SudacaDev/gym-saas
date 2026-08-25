import { NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { memberSchema } from "@/lib/validations/member.schema";
import { handleApiError, isUniqueViolation } from "@/lib/api/handle-api-error";
import { generateShortCode } from "@/lib/members/generate-short-code";
import { generateCheckinCode } from "@/lib/members/generate-checkin-code";
import type { Member } from "@/db/schema/members";

// Small collision-retry budget shared by both generated per-tenant codes
// (T-20260825-003's shortCode, T-20260825-004's checkinCode) — see their
// respective generate-*.ts docstrings for why this should almost never
// actually retry (45.7M / 1M combinations per tenant respectively). On any
// collision, both codes are regenerated together rather than only the one
// that collided — simpler than tracking which field failed, and the
// combined collision odds are still negligible.
const GENERATED_CODE_MAX_ATTEMPTS = 5;

// Front desk (staff) gives members a walk-in sign-up, so both owner and
// staff can list/create — unlike plans, where pricing is owner-only.
export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const members = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .select()
          .from(schema.members)
          .where(isNull(schema.members.deletedAt)),
    );

    return NextResponse.json(members);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = memberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    let member: Member | undefined;
    let lastCollisionError: unknown;

    for (let attempt = 0; attempt < GENERATED_CODE_MAX_ATTEMPTS; attempt++) {
      const shortCode = generateShortCode();
      const checkinCode = generateCheckinCode();
      try {
        [member] = await withTenantContext(
          context.tenantId,
          context.role,
          (tx) =>
            tx
              .insert(schema.members)
              .values({
                tenantId: context.tenantId,
                shortCode,
                checkinCode,
                firstName: parsed.data.firstName,
                lastName: parsed.data.lastName,
                email: parsed.data.email,
                phone: parsed.data.phone,
                birthDate: parsed.data.birthDate,
                dni: parsed.data.dni,
                medicalCertificateSubmitted: parsed.data.medicalCertificateSubmitted,
                healthNotes: parsed.data.healthNotes,
                emailOptOut: parsed.data.emailOptOut,
              })
              .returning(),
        );
        break;
      } catch (error) {
        if (
          isUniqueViolation(error, "members_tenant_id_short_code_unique") ||
          isUniqueViolation(error, "members_tenant_id_checkin_code_unique")
        ) {
          lastCollisionError = error;
          continue;
        }
        throw error;
      }
    }

    if (!member) {
      console.error(
        "Failed to generate a unique member short code / checkin code after retries",
        lastCollisionError,
      );
      return NextResponse.json(
        { error: "No se pudo generar un código de socio único, intentá de nuevo" },
        { status: 503 },
      );
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
