import { z } from "zod";

// productId required for kind "product", forbidden for "day_pass" — a
// day pass never references the catalog. `amount` is only taken from the
// client for "day_pass" — for "product" the server derives it from the
// catalog's current price (app/api/v1/walk-in-sales/route.ts), so a
// tampered client-sent amount can never under/overcharge a catalog item.
// label is the mirror image of productId: meaningless for "product" (the
// name comes from the join), an optional walk-in name for "day_pass".
export const walkInSaleSchema = z
  .object({
    kind: z.enum(["product", "day_pass"]),
    productId: z.uuid().optional(),
    label: z.string().trim().optional(),
    amount: z.coerce.number().positive("El monto debe ser un número positivo").optional(),
  })
  .refine((data) => data.kind !== "product" || !!data.productId, {
    message: "Elegí un producto",
    path: ["productId"],
  })
  .refine((data) => data.kind !== "day_pass" || data.amount !== undefined, {
    message: "Ingresá un monto",
    path: ["amount"],
  });

export type WalkInSaleInput = z.input<typeof walkInSaleSchema>;
export type WalkInSaleOutput = z.output<typeof walkInSaleSchema>;
