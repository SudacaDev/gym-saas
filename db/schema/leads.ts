import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { leadStatusEnum } from "./enums";

/**
 * A walk-in prospect who asked about the gym at the counter (T-20260826-013)
 * — staff captures name + WhatsApp on the spot while explaining the plan
 * and gifting a trial class. `createdAt` doubles as "fecha" (when they
 * walked in) — same convention as `walk_in_sales`/`checkins`, no separate
 * date column needed.
 *
 * `status` starts at "nuevo" and is moved to "convertido"/"perdido" by
 * staff/owner as follow-up happens. Deliberately NOT wired to any
 * WhatsApp/email automation in this first pass — that's a separate, larger
 * backlog item (reminders/automations) explicitly deferred, not built here.
 *
 * No `deletedAt`/DELETE endpoint: a lead that didn't pan out is marked
 * "perdido", not removed — same "status is the soft-delete" shape as most
 * append-ish tables in this codebase, just with an explicit enum instead of
 * a nullable timestamp.
 */
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  note: text("note"),
  status: leadStatusEnum("status").notNull().default("nuevo"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
