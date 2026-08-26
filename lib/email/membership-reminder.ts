import { getResendClient } from "./resend-client";

export interface MembershipReminderInput {
  memberName: string;
  memberEmail: string;
  tenantName: string;
  planName: string;
  endDate: string; // "YYYY-MM-DD" — a Membership.endDate as stored, not a Date instance.
}

export interface MembershipReminderEmail {
  subject: string;
  html: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function formatDateOnly(dateOnly: string): string {
  // Same "parse as UTC noon" trick used throughout the app (see
  // member-detail-page/index.tsx) so the server's local timezone can't
  // shift a DATE column back/forward a day when displayed.
  return dateFormatter.format(new Date(`${dateOnly}T12:00:00Z`));
}

/**
 * Pure builder for the membership-reminder email's subject/body — same
 * split as buildPaymentReceiptEmail (lib/email/payment-receipt.ts), kept
 * separate from sendMembershipReminderEmail() so it's unit-testable without
 * touching the Resend API. Tone: cordial and direct, one clear ask (renovar
 * antes de que venza), no urgency-manufacturing language — this is an
 * operational notice from the gym the member already trains at, not a
 * marketing email.
 */
export function buildMembershipReminderEmail(
  input: MembershipReminderInput,
): MembershipReminderEmail {
  const endDateFormatted = formatDateOnly(input.endDate);
  const subject = `Tu cuota en ${input.tenantName} vence el ${endDateFormatted}`;

  const html = `<!doctype html>
<html>
  <body style="font-family: sans-serif; color: #0a0a0a; padding: 24px;">
    <h1 style="font-size: 20px;">Recordatorio de vencimiento</h1>
    <p>Hola ${input.memberName},</p>
    <p>
      Te escribimos de ${input.tenantName} para avisarte que tu membresía
      "${input.planName}" vence el <strong>${endDateFormatted}</strong>.
    </p>
    <p>
      Si todavía no renovaste, pasá por recepción o coordiná el pago para
      seguir entrenando sin interrupciones.
    </p>
    <p>¡Te esperamos!</p>
  </body>
</html>`;

  return { subject, html };
}

/**
 * Sends the membership-reminder via Resend. Callers are expected to treat
 * this as best-effort at the HTTP-response level (same convention as
 * sendPaymentReceiptEmail): catch any error, log it, and — for this
 * reminder specifically — persist the failure into email_send_log so it
 * shows up in the log rather than silently vanishing.
 */
export async function sendMembershipReminderEmail(
  input: MembershipReminderInput,
): Promise<{ providerMessageId: string | null }> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not set. Copy .env.local.example to " +
        ".env.local and fill in a verified Resend sender address.",
    );
  }

  const { subject, html } = buildMembershipReminderEmail(input);

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from,
    to: input.memberEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend rechazó el envío: ${error.message}`);
  }

  return { providerMessageId: data?.id ?? null };
}
