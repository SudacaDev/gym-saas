import { z } from "zod";

// method is intentionally NOT part of this schema: this phase only
// supports front-desk manual check-in (see db/schema/enums.ts's
// checkinMethodEnum for the other values, unused until QR/NFC — which
// need a member-facing login that doesn't exist yet — are built). The
// route handler always inserts "manual", never trusted from the client.
export const checkinCreateSchema = z.object({
  memberId: z.uuid("Socio inválido"),
});

export type CheckinCreateInput = z.input<typeof checkinCreateSchema>;
export type CheckinCreateOutput = z.output<typeof checkinCreateSchema>;

// Self-service auto-check-in by code (T-20260825-004, POST
// /api/v1/checkins/self) — `code` is the member's own 6-digit
// `checkin_code`, resolved to a member server-side (never trusted as a
// memberId directly). Exactly 6 digits, same shape as
// lib/members/generate-checkin-code.ts produces.
export const checkinSelfSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Código inválido"),
});

export type CheckinSelfInput = z.input<typeof checkinSelfSchema>;
export type CheckinSelfOutput = z.output<typeof checkinSelfSchema>;
