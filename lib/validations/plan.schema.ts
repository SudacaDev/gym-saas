import { z } from "zod";
import { planPeriodEnum } from "@/db/schema/enums";

export const planSchema = z.object({
  name: z.string().trim().min(1, "El nombre del plan es obligatorio"),
  price: z.coerce
    .number()
    .positive("El precio debe ser un número positivo"),
  period: z.enum(planPeriodEnum.enumValues, {
    message: "Periodicidad inválida",
  }),
});

// Input = what's actually in the form fields (price can be a raw string
// before z.coerce.number() runs); Output = what onSubmit/the API receive
// (price coerced to number). See member.schema.ts for why these need to
// be two distinct types with @hookform/resolvers v5 (zod v4).
export type PlanInput = z.input<typeof planSchema>;
export type PlanOutput = z.output<typeof planSchema>;
