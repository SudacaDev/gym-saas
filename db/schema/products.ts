import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * A counter-sale product (T-20260826-012) — water, protein bars, t-shirts.
 * No stock/inventory tracking (confirmed with the user: a simple priced
 * catalog is enough for this first pass, not real quantity-on-hand). No
 * `deletedAt`: same convention as `plans` — a product with sale history is
 * blocked from deletion by `walk_in_sales.productId`'s `onDelete: "restrict"`
 * FK instead (409, same pattern as plans -> memberships).
 */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
