export type ReservationStatus = "reserved" | "waitlisted" | "attended" | "absent" | "cancelled";

/** Shape returned by GET/POST/PATCH app/api/v1/schedules/[id]/occurrences/reservations[/[reservationId]]. */
export interface OccurrenceReservation {
  id: string;
  status: ReservationStatus;
  createdAt: string;
  memberId: string;
  firstName: string | null;
  lastName: string | null;
}

/** Shape returned by GET app/api/v1/schedules/[id]/occurrences?date=. */
export interface OccurrenceData {
  date: string;
  capacity: number | null;
  reservations: OccurrenceReservation[];
}
