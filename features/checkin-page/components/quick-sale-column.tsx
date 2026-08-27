"use client";

import { Button } from "@/components/ui/button";
import { useQuickSale } from "../hooks/useQuickSale";
import styles from "./quick-sale-column.module.css";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

/**
 * "Punto de venta rápido" column (T-20260826-015) — grilla compacta de
 * productos, un tap para vender (ver useQuickSale.ts, mismo patrón que
 * features/kiosk-page/index.tsx). Sin gestión de catálogo (crear/editar/
 * borrar producto), sin pase diario, sin "ventas de hoy": esa
 * funcionalidad completa sigue viviendo exclusivamente en /kiosk — esta
 * columna es solo el recorte de "cobro rápido" que pidió esta tarea.
 */
export function QuickSaleColumn() {
  const { products, loading, error, sellingId, saleMessage, sellProduct } = useQuickSale();

  return (
    <section className={styles.column} aria-label="Punto de venta rápido">
      <h2 className={styles.columnTitle}>Punto de venta rápido</h2>

      {error && <p className={styles.errorText}>{error}</p>}
      {saleMessage && !error && <p className={styles.successText}>{saleMessage}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : products.length === 0 ? (
        <p className={styles.emptyText}>Todavía no hay productos cargados.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <div key={product.id} className={styles.card}>
              <span className={styles.cardName}>{product.name}</span>
              <span className={styles.cardPrice}>
                {currencyFormatter.format(Number(product.price))}
              </span>
              <Button
                size="sm"
                className={styles.sellButton}
                disabled={sellingId === product.id}
                onClick={() => sellProduct(product)}
              >
                {sellingId === product.id ? "Vendiendo..." : "Vender"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
