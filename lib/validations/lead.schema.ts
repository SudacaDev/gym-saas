import { z } from "zod";

// Create: name + whatsapp required, note optional. `status` is never
// client-chosen here — a new lead always starts "nuevo" server-side (see
// app/api/v1/leads/route.ts) — same reasoning as reservationCreateSchema
// never accepting a client-picked status.
export const leadSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  whatsapp: z.string().trim().min(1, "El WhatsApp es obligatorio"),
  note: z.string().trim().optional(),
});
export type LeadInput = z.input<typeof leadSchema>;
export type LeadOutput = z.output<typeof leadSchema>;

// A PATCH only ever moves a lead's status — no full edit of name/whatsapp
// in this first pass (not part of the confirmed minimal scope), mirroring
// reservationStatusUpdateSchema's narrow "status transition only" shape.
export const leadStatusUpdateSchema = z.object({
  status: z.enum(["nuevo", "convertido", "perdido"]),
});
export type LeadStatusUpdateInput = z.input<typeof leadStatusUpdateSchema>;
