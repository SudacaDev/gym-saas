import { z } from "zod";

export const activitySchema = z.object({
  name: z.string().trim().min(1, "El nombre de la actividad es obligatorio"),
});

export type ActivityInput = z.input<typeof activitySchema>;
export type ActivityOutput = z.output<typeof activitySchema>;
