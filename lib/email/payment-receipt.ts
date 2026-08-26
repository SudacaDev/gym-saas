import { getResendClient } from "./resend-client";

export interface PaymentReceiptInput {
  memberName: string;
  memberEmail: string;
  tenantName: string;
  planName: string;
  amount: number;
  paidAt: Date;
}

export interface PaymentReceiptEmail {
  subject: string;
  html: string;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

/**
 * Pure builder for the payment receipt email's subject/body — kept
 * separate from sendPaymentReceiptEmail() so it can be unit tested without
 * touching the Resend API (see tests/unit/payment-receipt.test.ts). No
 * template engine, just a small interpolated HTML string — this is a
 * single transactional email, not a system that needs one.
 */
export function buildPaymentReceiptEmail(
  input: PaymentReceiptInput,
): PaymentReceiptEmail {
  const amountFormatted = currencyFormatter.format(input.amount);
  const dateFormatted = dateFormatter.format(input.paidAt);

  const subject = `Recibo de pago — ${input.tenantName}`;

  const html = `<!doctype html>
<html>
  <body style="font-family: sans-serif; color: #0a0a0a; padding: 24px;">
    <h1 style="font-size: 20px;">Recibo de pago</h1>
    <p>Hola ${input.memberName},</p>
    <p>Confirmamos que registramos tu pago en ${input.tenantName}.</p>
    <table cellpadding="8" style="border-collapse: collapse;">
      <tr>
        <td style="color: #6b6b6b;">Plan</td>
        <td>${input.planName}</td>
      </tr>
      <tr>
        <td style="color: #6b6b6b;">Monto</td>
        <td>${amountFormatted}</td>
      </tr>
      <tr>
        <td style="color: #6b6b6b;">Fecha</td>
        <td>${dateFormatted}</td>
      </tr>
    </table>
    <p>¡Gracias!</p>
  </body>
</html>`;

  return { subject, html };
}

/**
 * Sends the payment receipt via Resend. Callers (app/api/v1/payments'
 * POST handler) are expected to treat this as best-effort: catch any
 * error themselves and log it rather than let it fail the payment
 * response, since a payment was already successfully recorded by the
 * time this runs.
 */
export async function sendPaymentReceiptEmail(
  input: PaymentReceiptInput,
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not set. Copy .env.local.example to " +
        ".env.local and fill in a verified Resend sender address.",
    );
  }

  const { subject, html } = buildPaymentReceiptEmail(input);

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: input.memberEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend rechazó el envío: ${error.message}`);
  }
}
