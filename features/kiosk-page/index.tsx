"use client";

import { useState } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CatalogTableSkeleton } from "./components/catalog-table-skeleton";
import { ProductFormDialog } from "./components/product-form-dialog";
import { SellGridSkeleton } from "./components/sell-grid-skeleton";
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
 *
 * Split into "Vender" (big tap targets, front-of-house) vs. "Catálogo"
 * (compact table, owner-only back-office CRUD) per the design critique
 * (.impeccable/critique) — the two used to share one card with Vender next
 * to Editar/Borrar at equal weight, a real mis-tap risk mid-rush.
 */
export function KioskPage({ role }: KioskPageProps) {
  const isOwner = role === "owner";
  const {
    products,
    loading,
    error,
    sellingId,
    deletingId,
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
      <h1 className={styles.title}>Cobro rápido</h1>

      {error && <p className={styles.errorText}>{error}</p>}
      {saleMessage && !error && <p className={styles.successText}>{saleMessage}</p>}

      <section className={styles.venderPanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Vender</h2>
          {isOwner && todayTotal !== null && (
            <p className={styles.todayTotal}>
              Ventas de hoy: {currencyFormatter.format(todayTotal)}
            </p>
          )}
        </div>

        {loading ? (
          <SellGridSkeleton />
        ) : products.length === 0 ? (
          <p className={styles.emptyText}>
            {isOwner ? "Todavía no cargaste productos." : "Todavía no hay productos cargados."}
          </p>
        ) : (
          <div className={styles.sellGrid}>
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className={styles.sellTile}
                disabled={sellingId === product.id}
                onClick={() => sellProduct(product)}
              >
                <span className={styles.sellTileName}>{product.name}</span>
                <span className={styles.sellTilePrice}>
                  {currencyFormatter.format(Number(product.price))}
                </span>
                <span className={styles.sellTileCta}>
                  {sellingId === product.id ? "Vendiendo..." : "Vender"}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.dayPassCard}>
          <h3 className={styles.dayPassTitle}>Pase diario</h3>
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
        </div>
      </section>

      {isOwner && (
        <section className={styles.catalogPanel}>
          <div className={styles.catalogHeader}>
            <h2 className={styles.catalogTitle}>Catálogo</h2>
            <ProductFormDialog
              trigger={
                <Button variant="outline" size="sm">
                  Nuevo producto
                </Button>
              }
              onSaved={handleProductSaved}
            />
          </div>

          {loading && <CatalogTableSkeleton />}

          {!loading && products.length === 0 && (
            <p className={styles.emptyText}>Agregá productos para que aparezcan en Vender.</p>
          )}

          {!loading && products.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className={styles.actionsHead}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{currencyFormatter.format(Number(product.price))}</TableCell>
                    <TableCell>
                      <div className={styles.catalogActions}>
                        <ProductFormDialog
                          product={product}
                          trigger={
                            <Button variant="outline" size="icon-xs" aria-label={`Editar ${product.name}`}>
                              <PencilIcon />
                            </Button>
                          }
                          onSaved={handleProductSaved}
                        />
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          aria-label={`Borrar ${product.name}`}
                          disabled={deletingId === product.id}
                          onClick={() => handleProductDelete(product)}
                        >
                          {deletingId === product.id ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <Trash2Icon />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
