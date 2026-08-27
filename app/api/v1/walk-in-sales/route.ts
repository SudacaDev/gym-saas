import { NextResponse } from "next/server";
import { eq, gte } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { walkInSaleSchema } from "@/lib/validations/walk-in-sale.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

// Owner-only, same reasoning as dashboard-page hiding revenue from staff
// (T-20260821-006) — a sales log/total is revenue data. `?since=` (ISO
// timestamp) narrows it, e.g. the kiosk screen's "hoy" total — no reason
// to always return full history for that.
export async function GET(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const since = new URL(request.url).searchParams.get("since");

    const sales = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .select()
        .from(schema.walkInSales)
        .where(since ? gte(schema.walkInSales.createdAt, new Date(since)) : undefined),
    );

    return NextResponse.json(sales);
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner+staff — ringing up a sale is a front-desk action, same tier as
// checkins/schedules. Pricing itself isn't decided here: for a "product"
// sale, the amount is always the catalog's current price (never trusts a
// client-sent amount for it); for a "day_pass", staff enters the amount
// directly (no catalog entry for day passes — see db/schema/walk-in-sales.ts).
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = walkInSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const result = await withTenantContext(context.tenantId, context.role, async (tx) => {
      if (parsed.data.kind === "product") {
        const [product] = await tx
          .select({ price: schema.products.price })
          .from(schema.products)
          .where(eq(schema.products.id, parsed.data.productId!));

        if (!product) {
          return "product_not_found" as const;
        }

        return tx
          .insert(schema.walkInSales)
          .values({
            tenantId: context.tenantId,
            kind: "product",
            productId: parsed.data.productId,
            amount: product.price,
          })
          .returning();
      }

      return tx
        .insert(schema.walkInSales)
        .values({
          tenantId: context.tenantId,
          kind: "day_pass",
          label: parsed.data.label || null,
          amount: parsed.data.amount!.toString(),
        })
        .returning();
    });

    if (result === "product_not_found") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
