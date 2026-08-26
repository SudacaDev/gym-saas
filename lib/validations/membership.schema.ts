import { z } from "zod";
import { membershipStatusEnum } from "@/db/schema/enums";

// memberId/planId existing and belonging to this tenant is enforced by the
// FK constraints on memberships.member_id/plan_id combined with RLS, not
// duplicated here — see app/api/v1/memberships/route.ts's POST handler.
export const membershipCreateSchema = z.object({
  memberId: z.uuid("Socio inválido"),
  planId: z.uuid("Plan inválido"),
  startDate: z.iso.date("Fecha de inicio inválida"),
});

// PATCH: pause/cancel/reactivate, or manually correct endDate. The normal
// renewal path (extending endDate on a payment) is POST
// /api/v1/payments, not this — this is for the exceptional manual case.
export const membershipUpdateSchema = z.object({
  status: z.enum(membershipStatusEnum.enumValues, {
    message: "Estado inválido",
  }),
  endDate: z.iso.date("Fecha de vencimiento inválida"),
}).partial();

export type MembershipCreateInput = z.input<typeof membershipCreateSchema>;
export type MembershipCreateOutput = z.output<typeof membershipCreateSchema>;
export type MembershipUpdateInput = z.input<typeof membershipUpdateSchema>;
export type MembershipUpdateOutput = z.output<typeof membershipUpdateSchema>;
