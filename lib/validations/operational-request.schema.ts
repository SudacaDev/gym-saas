import { z } from "zod";

// "category" is intentionally optional — not every report is neatly
// "supplies" or "maintenance" (see db/schema/enums.ts's docstring); staff
// shouldn't be blocked from filing a report just because it doesn't fit.
export const operationalRequestSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  category: z.enum(["supplies", "maintenance"]).optional(),
});
export type OperationalRequestInput = z.input<typeof operationalRequestSchema>;
export type OperationalRequestOutput = z.output<typeof operationalRequestSchema>;

// Same shape as reservationStatusUpdateSchema (lib/validations/reservation.schema.ts):
// a PATCH only ever flips the status, never re-edits the description/category
// that was originally reported.
export const operationalRequestStatusUpdateSchema = z.object({
  status: z.enum(["open", "resolved"]),
});
export type OperationalRequestStatusUpdateInput = z.input<
  typeof operationalRequestStatusUpdateSchema
>;
