"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/db/schema/products";

/**
 * "Punto de venta rápido" column state (T-20260826-015): the same
 * one-tap-sell pattern features/kiosk-page/hooks/useKiosk.ts already
 * built, trimmed down to only what this column needs — the product grid
 * and `sellProduct`. No day-pass sale, no "ventas de hoy" total (revenue
 * data, same reasoning kiosk-page hides it from staff — out of place in a
 * compact counter widget either way), no catalog management (create/edit/
 * delete stays exclusive to /kiosk, this column would otherwise duplicate
 * it). Deliberately not importing useKiosk itself — this project's
 * features don't import each other's files (see useCurrentClass.ts's
 * docstring for the same note) — so this is a small, intentional
 * duplicate of the product-fetch/sell logic, not a shared hook.
 */
export function useQuickSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [saleMessage, setSaleMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/products");
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function sellProduct(product: Product) {
    setError(null);
    setSaleMessage(null);
    setSellingId(product.id);
    try {
      const res = await fetch("/api/v1/walk-in-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "product", productId: product.id }),
      });
      if (!res.ok) {
        setError("No se pudo registrar la venta");
        return;
      }
      setSaleMessage(`Vendido: ${product.name}`);
    } finally {
      setSellingId(null);
    }
  }

  return {
    products,
    loading,
    error,
    sellingId,
    saleMessage,
    sellProduct,
  };
}
