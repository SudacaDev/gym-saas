import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { members } from "./members";
import { checkinMethodEnum } from "./enums";

/**
 * A single gym visit/check-in event for a Member.
 */
export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  method: checkinMethodEnum("method").notNull().default("manual"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Null while the member is still in the gym. Set once, via PATCH
  // /api/v1/checkins/[id] — never auto-expired in the DB itself; a check-in
  // from a previous day with this still null is simply treated as closed
  // by anything that cares "who's inside right now" (see
  // app/api/v1/checkins/route.ts's GET ?open=true), not backfilled.
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
});

export type Checkin = typeof checkins.$inferSelect;
export type NewCheckin = typeof checkins.$inferInsert;
