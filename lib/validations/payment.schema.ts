import { z } from "zod";

// memberId is intentionally NOT part of this schema: the payment's
// memberId is derived server-side from the membership row (see
// app/api/v1/payments/route.ts's POST handler), rather than trusted from
// the client, so a caller can't submit a memberId that doesn't actually
// match the membershipId it's paired with.
export const paymentCreateSchema = z.object({
  membershipId: z.uuid("Membresía inválida"),
  amount: z.coerce.number().positive("El monto debe ser un número positivo"),
});

export type PaymentCreateInput = z.input<typeof paymentCreateSchema>;
export type PaymentCreateOutput = z.output<typeof paymentCreateSchema>;
