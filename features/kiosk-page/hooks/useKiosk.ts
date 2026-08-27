"use client";
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/db/schema/products";
import type { WalkInSale } from "@/db/schema/walk-in-sales";

export function useKiosk(role: "owner" | "staff") {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [todayTotal, setTodayTotal] = useState<number | null>(null);
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

  // "Ventas de hoy" is revenue data — GET /api/v1/walk-in-sales is
  // owner-only, so this simply doesn't run for staff (role passed down
  // server-side from app/(owner)/kiosk/page.tsx).
  const loadTodayTotal = useCallback(async () => {
    if (role !== "owner") return;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const res = await fetch(`/api/v1/walk-in-sales?since=${since.toISOString()}`);
    if (!res.ok) return;
    const sales: WalkInSale[] = await res.json();
    setTodayTotal(sales.reduce((sum, s) => sum + Number(s.amount), 0));
  }, [role]);

  useEffect(() => {
    loadProducts();
    loadTodayTotal();
  }, [loadProducts, loadTodayTotal]);

  function handleProductSaved(product: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [...prev, product];
    });
  }

  async function handleProductDelete(product: Product) {
    if (!confirm(`¿Borrar "${product.name}"?`)) return;
    const res = await fetch(`/api/v1/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "No se pudo borrar el producto");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

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
      loadTodayTotal();
    } finally {
      setSellingId(null);
    }
  }

  async function sellDayPass(label: string, amount: number): Promise<boolean> {
    setError(null);
    setSaleMessage(null);
    const res = await fetch("/api/v1/walk-in-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "day_pass", label: label || undefined, amount }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "No se pudo registrar el pase");
      return false;
    }
    setSaleMessage("Pase diario vendido");
    loadTodayTotal();
    return true;
  }

  return {
    products,
    loading,
    error,
    sellingId,
    todayTotal,
    saleMessage,
    handleProductSaved,
    handleProductDelete,
    sellProduct,
    sellDayPass,
  };
}
