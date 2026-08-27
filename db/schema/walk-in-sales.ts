import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { products } from "./products";
import { walkInSaleKindEnum } from "./enums";

/**
 * One counter sale (T-20260826-012) — either a `product` (references
 * `products`, `label` null: the name comes from the join) or a `day_pass`
 * (no `productId`, `label` optionally holds the walk-in's name if staff
 * bothered to ask). Append-only, same convention as `payments`: no
 * `updatedAt`, no delete path — a correction is a new row, not an edit.
 *
 * `productId` is `onDelete: "restrict"` — same 409-on-delete pattern as
 * `plans` -> `memberships`: you can't delete a product that has sale
 * history, only stop selling it going forward.
 *
 * Deliberately NOT wired to `members`/`checkins`/`memberships` at all: the
 * user confirmed a day pass is a lightweight, standalone concept for
 * someone who may never come back, not a 1-day Membership — forcing that
 * heavier machinery for a walk-in was explicitly ruled out.
 */
export const walkInSales = pgTable("walk_in_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  kind: walkInSaleKindEnum("kind").notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
  label: text("label"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WalkInSale = typeof walkInSales.$inferSelect;
export type NewWalkInSale = typeof walkInSales.$inferInsert;
