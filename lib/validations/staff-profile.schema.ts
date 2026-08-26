import { z } from "zod";

// Self-service business-data fields (T-20260826-009) — a deliberately
// smaller surface than lib/validations/staff-member.schema.ts's
// staffMemberUpdateSchema: `phone` for everyone with a profile,
// certifications/certificationExpiresAt only ever applied for
// staffCategory "instructor" by app/api/v1/staff/me/route.ts (silently
// ignored otherwise, same pattern as the create schema conditionally
// nulling category-specific fields).
export const staffProfileUpdateSchema = z.object({
  phone: z.string().trim().min(6, "Teléfono inválido"),
  certifications: z.string().trim().optional(),
  certificationExpiresAt: z.string().trim().optional(),
});
export type StaffProfileUpdateInput = z.input<typeof staffProfileUpdateSchema>;
export type StaffProfileUpdateOutput = z.output<typeof staffProfileUpdateSchema>;

// Password change reuses the same minimum-length policy as account
// creation (lib/validations/staff-member.schema.ts, lib/validations/auth.ts)
// — no new policy invented. Called directly against
// supabase.auth.updateUser() client-side, not through our own API route
// (Supabase applies it to the caller's own session, no service role
// needed) — see features/profile-page/components/profile-password-form.tsx.
export const staffPasswordChangeSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});
export type StaffPasswordChangeInput = z.input<typeof staffPasswordChangeSchema>;

// Email change, same client-side supabase.auth.updateUser() path. Supabase
// sends a confirmation link to the new address and does not apply the
// change until it's clicked — see the form component's docstring for the
// known gap this leaves (our local users.email mirror doesn't re-sync
// automatically once that confirmation completes).
export const staffEmailChangeSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});
export type StaffEmailChangeInput = z.input<typeof staffEmailChangeSchema>;
