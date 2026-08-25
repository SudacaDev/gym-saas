import { z } from "zod";

export const STAFF_CATEGORIES = ["instructor", "administrative", "cleaning"] as const;
export const STAFF_SPECIALTIES = ["crossfit", "funcional", "pesas", "movilidad", "otro"] as const;
export const STAFF_DEPARTMENTS = ["reception", "sales", "billing", "management"] as const;
export const STAFF_SHIFTS = ["morning", "afternoon", "night", "rotating"] as const;

const staffMemberFields = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z.string().trim().email("Email inválido"),
  // Separate, app-level identity from `email` (the real Supabase Auth
  // login) — display-only in this pass, see db/schema/staff-members.ts.
  // Unique per tenant, enforced by the DB (staff_members_tenant_id_username_unique).
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario no puede superar los 30 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "El usuario solo puede tener letras, números, y . _ -"),
  phone: z.string().trim().min(6, "Teléfono inválido"),
  dni: z.string().trim().regex(/^\d{7,8}$/, "DNI inválido (7-8 dígitos)"),
  staffCategory: z.enum(STAFF_CATEGORIES, { message: "Categoría inválida" }),
  hireDate: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  // Instructor-only
  specialties: z.array(z.enum(STAFF_SPECIALTIES)).optional(),
  certifications: z.string().trim().optional(),
  certificationExpiresAt: z.string().trim().optional(),
  // Administrative-only
  department: z.enum(STAFF_DEPARTMENTS).optional(),
  // Cleaning-only
  shift: z.enum(STAFF_SHIFTS).optional(),
});

function requireSpecialtiesForInstructor(
  data: { staffCategory: string; specialties?: string[] },
  ctx: z.RefinementCtx,
) {
  if (data.staffCategory === "instructor" && (!data.specialties || data.specialties.length === 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["specialties"],
      message: "Elegí al menos una especialidad",
    });
  }
}

// Password validation reuses the same minimum-length policy already
// established for account creation in lib/validations/auth.ts
// (signUpSchema: min 8 chars) — no new password policy invented here.
// Owner-defined, becomes the account's real login credential immediately
// (see app/api/v1/staff/route.ts) — this REPLACES the invite-by-email flow
// where the new hire set their own password (T-20260821-007). Only
// present on the CREATE schema: editing/resetting a password is out of
// scope for this pass (see staffMemberUpdateSchema below).
export const staffMemberSchema = staffMemberFields
  .extend({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  })
  .superRefine(requireSpecialtiesForInstructor);

export type StaffMemberInput = z.input<typeof staffMemberSchema>;
export type StaffMemberOutput = z.output<typeof staffMemberSchema>;

// PATCH allows editing everything except the fields that touch the
// Supabase Auth account itself (email, which is the account identity) —
// those require a separate, more sensitive flow, not implemented in this
// pass. `username` stays editable here (display-only field, not a
// credential). `password` is deliberately NOT part of this schema — a
// "reset password" action is a distinct, more sensitive flow than a
// regular HR-field edit and is out of scope for this pass (known gap, see
// gate T-20260825-002).
export const staffMemberUpdateSchema = staffMemberFields.omit({ email: true }).partial();
export type StaffMemberUpdateInput = z.input<typeof staffMemberUpdateSchema>;
export type StaffMemberUpdateOutput = z.output<typeof staffMemberUpdateSchema>;
