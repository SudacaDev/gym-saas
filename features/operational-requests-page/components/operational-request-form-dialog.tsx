"use client";

import { useState, type ReactElement } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  operationalRequestSchema,
  type OperationalRequestInput,
  type OperationalRequestOutput,
} from "@/lib/validations/operational-request.schema";
import type { OperationalRequestRow } from "../hooks/useOperationalRequests";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "./operational-request-form-dialog.module.css";

const CATEGORY_LABELS: Record<NonNullable<OperationalRequestInput["category"]>, string> = {
  supplies: "Insumos",
  maintenance: "Mantenimiento",
};

const DEFAULTS: OperationalRequestInput = { description: "" };

/**
 * Create dialog for an OperationalRequest (T-20260826-010) — mirrors
 * LeadFormDialog's shape. Create-only: no edit mode, no PATCH of
 * description/category here — the only post-creation action is the status
 * toggle in features/operational-requests-page's table (PATCH
 * /api/v1/operational-requests/[id], status only). "category" is optional
 * — leaving it unselected is a valid submission, not an error.
 */
export function OperationalRequestFormDialog({
  trigger,
  onSaved,
}: {
  trigger: ReactElement;
  onSaved: (request: OperationalRequestRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OperationalRequestInput, unknown, OperationalRequestOutput>({
    resolver: zodResolver(operationalRequestSchema),
    defaultValues: DEFAULTS,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(DEFAULTS);
    }
  }

  async function onSubmit(values: OperationalRequestOutput) {
    setFormError(null);
    const res = await fetch("/api/v1/operational-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudo guardar la necesidad",
      );
      return;
    }

    onSaved((await res.json()) as OperationalRequestRow);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva necesidad</DialogTitle>
          <DialogDescription>
            Insumos que faltan, mantenimiento que hace falta — lo que sea que la sucursal
            necesite.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="operational-request-description">Descripción</Label>
            <textarea
              id="operational-request-description"
              rows={3}
              placeholder="Ej: faltan elementos de limpieza, la cinta 2 necesita mantenimiento..."
              className={styles.textarea}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "operational-request-description-error" : undefined
              }
              {...register("description")}
            />
            <FieldError
              id="operational-request-description-error"
              message={errors.description?.message}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="operational-request-category">Categoría (opcional)</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="operational-request-category" className={styles.selectTrigger}>
                    <SelectValue placeholder="Sin categoría">
                      {(value: OperationalRequestInput["category"] | null) =>
                        value ? CATEGORY_LABELS[value] : "Sin categoría"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
