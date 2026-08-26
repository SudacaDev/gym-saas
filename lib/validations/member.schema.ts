import { z } from "zod";

// An empty string from a form's optional input is normalized to
// `undefined` rather than kept as "" — so an omitted email/phone leaves
// the DB column untouched (create) or unchanged (update), instead of
// writing an empty string.
const optionalTrimmed = (message?: string) =>
  z
    .union([z.string().trim().email(message), z.literal("")])
    .optional()
    .transform((val) => (val === "" || val === undefined ? undefined : val));

// Empty-to-undefined for any plain optional text field (dni, healthNotes) —
// same normalization as phone above, so an omitted field leaves the DB
// column untouched (create) or unchanged (update) instead of writing "".
const optionalText = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" || val === undefined ? undefined : val));

// Argentina DNI: 7-8 digits, no dots/spaces (the form strips those before
// submit — see member-form-dialog.tsx).
const DNI_PATTERN = /^\d{7,8}$/;

export const memberSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio"),
  email: optionalTrimmed("Email inválido"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" || val === undefined ? undefined : val)),
  birthDate: optionalText(),
  dni: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" || val === undefined ? undefined : val))
    .refine((val) => val === undefined || DNI_PATTERN.test(val), {
      message: "DNI inválido (7-8 dígitos, sin puntos)",
    }),
  medicalCertificateSubmitted: z.boolean().optional(),
  healthNotes: optionalText(),
  emailOptOut: z.boolean().optional(),
});

// Input = what's actually in the form fields before Zod's .transform()
// runs (email/phone can still be "" at that point); Output = what
// onSubmit/the API actually receive (transformed, "" normalized away).
// Needed because @hookform/resolvers v5 (zod v4) types useForm's generics
// against these two distinctly instead of collapsing them into one.
export type MemberInput = z.input<typeof memberSchema>;
export type MemberOutput = z.output<typeof memberSchema>;
