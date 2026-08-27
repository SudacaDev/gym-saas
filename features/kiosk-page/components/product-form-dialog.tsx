"use client";

import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  type ProductInput,
  type ProductOutput,
} from "@/lib/validations/product.schema";
import type { Product } from "@/db/schema/products";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import styles from "./product-form-dialog.module.css";

function defaultsFor(product?: Product): ProductInput {
  return product ? { name: product.name, price: Number(product.price) } : { name: "", price: 0 };
}

interface ProductFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  /** Omit to create a new product; pass to edit an existing one. */
  product?: Product;
  onSaved: (product: Product) => void;
}

/** Create/edit dialog for a Product (T-20260826-012) — mirrors PlanFormDialog exactly, same fetch pattern, owner-only per app/api/v1/products/route.ts. */
export function ProductFormDialog({ trigger, product, onSaved }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput, unknown, ProductOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultsFor(product),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(defaultsFor(product));
    }
  }

  async function onSubmit(values: ProductOutput) {
    setFormError(null);
    const res = await fetch(product ? `/api/v1/products/${product.id}` : "/api/v1/products", {
      method: product ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudo guardar el producto",
      );
      return;
    }

    onSaved((await res.json()) as Product);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Sin control de stock — solo nombre y precio para vender desde el mostrador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "product-name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="product-name-error" message={errors.name?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="product-price">Precio</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? "product-price-error" : undefined}
              {...register("price")}
            />
            <FieldError id="product-price-error" message={errors.price?.message} />
          </div>
          {formError && (
            <p role="alert" className={styles.errorText}>
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
