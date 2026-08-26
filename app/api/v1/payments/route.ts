import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { paymentCreateSchema } from "@/lib/validations/payment.schema";
import { computeRenewedEndDate } from "@/lib/memberships/renewal";
import { handleApiError } from "@/lib/api/handle-api-error";
import { sendPaymentReceiptEmail } from "@/lib/email/payment-receipt";

// GET /api/v1/payments?membershipId=... — receipt/history for one
// membership, most recent first.
export async function GET(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const membershipId = new URL(request.url).searchParams.get("membershipId");
    if (!membershipId) {
      return NextResponse.json(
        { error: "membershipId es requerido" },
        { status: 400 },
      );
    }

    const payments = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.membershipId, membershipId))
          .orderBy(desc(schema.payments.createdAt)),
    );

    return NextResponse.json(payments);
  } catch (error) {
    return handleApiError(error);
  }
}

// Registers a payment staff already collected in cash/transfer at the
// counter. There's no gateway involved: `gatewayRef` stays null (that's
// exactly what distinguishes a manual payment from a future
// Stripe-originated one — see db/schema/payments.ts), and `status` is
// "paid" from the start since this is a record of money already
// received, not a charge attempt that might still fail.
//
// The important side effect: extends the membership's `endDate` by its
// plan's period (see lib/memberships/renewal.ts for the exact rule).
// Both writes happen inside the same withTenantContext transaction, so a
// payment is never recorded without the membership actually being
// extended (or vice versa).
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = paymentCreateSchema.safeParse(body);
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
        const [membership] = await tx
          .select({
            id: schema.memberships.id,
            memberId: schema.memberships.memberId,
            endDate: schema.memberships.endDate,
            planId: schema.memberships.planId,
          })
          .from(schema.memberships)
          .where(eq(schema.memberships.id, parsed.data.membershipId));

        if (!membership) {
          return null;
        }

        const [plan] = await tx
          .select({ name: schema.plans.name, period: schema.plans.period })
          .from(schema.plans)
          .where(eq(schema.plans.id, membership.planId));

        if (!plan) {
          return null;
        }

        // Fetched inside the same transaction as everything else here
        // purely to build the receipt email below — cheap reads, no
        // extra writes, so there's no reason to split them into a second
        // withTenantContext call.
        const [member] = await tx
          .select({
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
          })
          .from(schema.members)
          .where(eq(schema.members.id, membership.memberId));

        const [tenant] = await tx
          .select({ name: schema.tenants.name })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, context.tenantId));

        const [payment] = await tx
          .insert(schema.payments)
          .values({
            tenantId: context.tenantId,
            // Derived from the membership, not trusted from the client —
            // see payment.schema.ts's docstring.
            memberId: membership.memberId,
            membershipId: membership.id,
            amount: parsed.data.amount.toString(),
            status: "paid",
          })
          .returning();

        await tx
          .update(schema.memberships)
          .set({
            endDate: computeRenewedEndDate(membership.endDate, plan.period),
            updatedAt: new Date(),
          })
          .where(eq(schema.memberships.id, membership.id));

        return { payment, plan, member, tenantName: tenant?.name ?? "" };
      },
    );

    if (!result) {
      return NextResponse.json(
        { error: "Membresía no encontrada" },
        { status: 404 },
      );
    }

    const { payment, plan, member, tenantName } = result;

    // Best-effort receipt email, fired only after the transaction above has
    // actually committed (payment already durably recorded either way) and
    // only when the member has an email on file. Resend being slow, down,
    // or erroring must never turn an already-successful payment into a
    // failed API response — so this is caught and logged, never re-thrown.
    if (member?.email) {
      try {
        await sendPaymentReceiptEmail({
          memberEmail: member.email,
          memberName: `${member.firstName} ${member.lastName}`,
          tenantName,
          planName: plan.name,
          amount: Number(payment.amount),
          paidAt: payment.createdAt,
        });
      } catch (error) {
        console.error("No se pudo enviar el recibo de pago por email:", error);
      }
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
