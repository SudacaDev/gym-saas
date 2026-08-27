import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { productSchema } from "@/lib/validations/product.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

// GET: owner+staff — the kiosk screen (T-20260826-012) needs the catalog
// to sell from, same reasoning as plans' GET.
export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const products = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx.select().from(schema.products),
    );

    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner-only: pricing is the owner's call, not front desk's — same
// reasoning as app/api/v1/plans/route.ts's POST.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const [product] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .insert(schema.products)
        .values({
          tenantId: context.tenantId,
          name: parsed.data.name,
          price: parsed.data.price.toString(),
        })
        .returning(),
    );

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
