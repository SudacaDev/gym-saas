import { z } from "zod";

export const onboardingSchema = z.object({
  gymName: z
    .string()
    .trim()
    .min(2, "El nombre del gimnasio es muy corto")
    .max(120, "El nombre del gimnasio es muy largo"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
