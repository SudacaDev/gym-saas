import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * A tenant's catalog of class activities (e.g. "CrossFit", "Funcional",
 * "Pilates") — feeds the activity picker in Horarios so the owner/staff
 * don't retype the same name by hand each time. One row per distinct name
 * per tenant (see the unique index below); `class_schedules.activityId`
 * references this table.
 */
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("activities_tenant_id_name_unique").on(table.tenantId, table.name),
  ],
);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
