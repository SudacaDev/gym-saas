import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const reservationCreateSchema = z.object({
  date: z.string().regex(DATE_PATTERN, "Fecha inválida"),
  memberId: z.uuid("Elegí un socio"),
});
export type ReservationCreateInput = z.input<typeof reservationCreateSchema>;
export type ReservationCreateOutput = z.output<typeof reservationCreateSchema>;

// "reserved"/"waitlisted" are never a client-chosen target status — they're
// the server's own outcome of a POST (reserved if there's room, waitlisted
// otherwise) and of promoting the oldest waitlisted row when a slot frees
// up. A PATCH only ever moves a reservation OUT of "reserved" by one of
// these three.
export const reservationStatusUpdateSchema = z.object({
  status: z.enum(["attended", "absent", "cancelled"]),
});
export type ReservationStatusUpdateInput = z.input<typeof reservationStatusUpdateSchema>;
