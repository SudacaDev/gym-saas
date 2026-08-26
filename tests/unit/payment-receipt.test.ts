import { describe, expect, it } from "vitest";
import { buildPaymentReceiptEmail } from "@/lib/email/payment-receipt";

// Built the same way payment-receipt.ts formats the amount, rather than a
// hardcoded literal — Intl's es-AR currency format uses a U+00A0
// (non-breaking space) between "$" and the digits, not a regular space,
// which is easy to typo past in a plain string literal.
const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

/**
 * Pure unit test for lib/email/payment-receipt.ts's builder — no DB, no
 * Resend API call. Sending itself (sendPaymentReceiptEmail) isn't covered
 * here on purpose: there's no clean way to verify an actual Resend send
 * without mocking their SDK, and per the phase spec that complexity isn't
 * worth it for this phase — this test only proves the subject/body are
 * built correctly from a given input.
 */
describe("buildPaymentReceiptEmail", () => {
  it("arma el asunto y el cuerpo interpolando los datos del pago", () => {
    const { subject, html } = buildPaymentReceiptEmail({
      memberName: "Juana Pérez",
      memberEmail: "juana@example.com",
      tenantName: "BoxFlow Gym",
      planName: "Musculación Mensual",
      amount: 1500,
      paidAt: new Date("2026-08-15T12:00:00Z"),
    });

    expect(subject).toBe("Recibo de pago — BoxFlow Gym");
    expect(html).toContain("Juana Pérez");
    expect(html).toContain("BoxFlow Gym");
    expect(html).toContain("Musculación Mensual");
    expect(html).toContain(currencyFormatter.format(1500));
    expect(html).toContain("15 ago 2026");
  });
});
