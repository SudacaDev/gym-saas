import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { classOccurrences } from "./class-occurrences";
import { members } from "./members";
import { reservationStatusEnum } from "./enums";

/**
 * A Member's reservation for one ClassOccurrence (T-20260826-011).
 * `status` moves reserved -> attended (normal path) or reserved ->
 * absent/cancelled, both of which atomically promote the oldest
 * "waitlisted" row for the same occurrence — see
 * app/api/v1/schedules/[id]/occurrences/reservations/[reservationId]/route.ts.
 * `createdAt` doubles as the waitlist's FIFO order (first to wait, first
 * promoted) — no separate position/rank column needed.
 *
 * Always created by staff/owner from the counter (members have no login —
 * see PRODUCT.md), same permission model as the rest of app/api/v1/schedules/**.
 *
 * The unique index only covers non-cancelled rows: a member can cancel and
 * re-book the same occurrence later (common — plans change), which a plain
 * unique(occurrence, member) would incorrectly block forever after one
 * cancellation.
 */
export const classReservations = pgTable(
  "class_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    classOccurrenceId: uuid("class_occurrence_id")
      .notNull()
      .references(() => classOccurrences.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: reservationStatusEnum("status").notNull().default("reserved"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("class_reservations_active_unique")
      .on(table.classOccurrenceId, table.memberId)
      .where(sql`${table.status} <> 'cancelled'`),
  ],
);

export type ClassReservation = typeof classReservations.$inferSelect;
export type NewClassReservation = typeof classReservations.$inferInsert;
