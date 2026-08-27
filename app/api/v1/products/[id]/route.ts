import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewProduct } from "@/db/schema/products";
import { productSchema } from "@/lib/validations/product.schema";
import { handleApiError, isForeignKeyViolation } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Owner-only, same tier as app/api/v1/plans/[id]/route.ts — pricing.
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const body = await request.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const updates: Partial<NewProduct> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.price !== undefined) updates.price = parsed.data.price.toString();

    const [product] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx.update(schema.products).set(updates).where(eq(schema.products.id, id)).returning(),
    );

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// No deletedAt on products (see db/schema/products.ts) — a product with
// sale history is blocked by walk_in_sales.productId's FK restrict, same
// 409 pattern as plans -> memberships.
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const [product] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx.delete(schema.products).where(eq(schema.products.id, id)).returning(),
    );

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        { error: "No se puede borrar un producto con ventas registradas" },
        { status: 409 },
      );
    }
    return handleApiError(error);
  }
}
