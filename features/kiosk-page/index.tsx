"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductFormDialog } from "./components/product-form-dialog";
import styles from "./index.module.css";
import { useKiosk } from "./hooks/useKiosk";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

interface KioskPageProps {
  role: "owner" | "staff";
}

/**
 * Cobro rápido / mostrador (T-20260826-012) — vender un producto es un tap
 * (sin carrito, sin checkout de varios ítems: no se pidió eso, "pantalla
 * rápida" pedía velocidad, no un POS completo). Sin control de stock
 * (decisión confirmada con el usuario). "Ventas de hoy" es dato de
 * facturación — mismo criterio que dashboard-page ocultándolo a staff — y
 * viene ya resuelto server-side vía la prop `role` (app/(owner)/kiosk/page.tsx).
 */
export function KioskPage({ role }: KioskPageProps) {
  const isOwner = role === "owner";
  const {
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
  } = useKiosk(role);

  const [dayPassLabel, setDayPassLabel] = useState("");
  const [dayPassAmount, setDayPassAmount] = useState("");
  const [sellingDayPass, setSellingDayPass] = useState(false);

  async function handleSellDayPass() {
    const amount = Number(dayPassAmount);
    if (!amount || amount <= 0) return;
    setSellingDayPass(true);
    try {
      const ok = await sellDayPass(dayPassLabel, amount);
      if (ok) {
        setDayPassLabel("");
        setDayPassAmount("");
      }
    } finally {
      setSellingDayPass(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cobro rápido</h1>
          {isOwner && todayTotal !== null && (
            <p className={styles.todayTotal}>
              Ventas de hoy: {currencyFormatter.format(todayTotal)}
            </p>
          )}
        </div>
        {isOwner && (
          <ProductFormDialog trigger={<Button>Nuevo producto</Button>} onSaved={handleProductSaved} />
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {saleMessage && !error && <p className={styles.successText}>{saleMessage}</p>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Productos</h2>
        {loading ? (
          <p className={styles.emptyText}>Cargando...</p>
        ) : products.length === 0 ? (
          <p className={styles.emptyText}>
            {isOwner ? "Todavía no cargaste productos." : "Todavía no hay productos cargados."}
          </p>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <div key={product.id} className={styles.card}>
                <span className={styles.cardName}>{product.name}</span>
                <span className={styles.cardPrice}>{currencyFormatter.format(Number(product.price))}</span>
                <Button
                  size="sm"
                  disabled={sellingId === product.id}
                  onClick={() => sellProduct(product)}
                >
                  {sellingId === product.id ? "Vendiendo..." : "Vender"}
                </Button>
                {isOwner && (
                  <div className={styles.cardOwnerActions}>
                    <ProductFormDialog
                      product={product}
                      trigger={
                        <Button variant="outline" size="xs">
                          Editar
                        </Button>
                      }
                      onSaved={handleProductSaved}
                    />
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => handleProductDelete(product)}
                    >
                      Borrar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pase diario</h2>
        <div className={styles.dayPassRow}>
          <div className={styles.field}>
            <Label htmlFor="day-pass-label">Nombre (opcional)</Label>
            <Input
              id="day-pass-label"
              value={dayPassLabel}
              onChange={(e) => setDayPassLabel(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="day-pass-amount">Monto</Label>
            <Input
              id="day-pass-amount"
              type="number"
              step="0.01"
              value={dayPassAmount}
              onChange={(e) => setDayPassAmount(e.target.value)}
            />
          </div>
          <Button
            disabled={sellingDayPass || !dayPassAmount}
            onClick={handleSellDayPass}
          >
            {sellingDayPass ? "Vendiendo..." : "Vender pase"}
          </Button>
        </div>
      </section>
    </div>
  );
}
