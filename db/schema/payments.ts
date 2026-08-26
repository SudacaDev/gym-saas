import { pgTable, uuid, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { members } from "./members";
import { memberships } from "./memberships";
import { paymentStatusEnum } from "./enums";

/**
 * A Payment record. Append-only by convention: once inserted, a payment
 * row is never mutated by application code except to move `status`
 * forward via the payment gateway webhook (pending -> paid/failed); a
 * correction is a new row (e.g. a `refunded` row referencing the same
 * membership), not an UPDATE that rewrites history. There is no delete
 * path for this table.
 */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "restrict" }),
  membershipId: uuid("membership_id").references(() => memberships.id, {
    onDelete: "restrict",
  }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  gatewayRef: text("gateway_ref"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
