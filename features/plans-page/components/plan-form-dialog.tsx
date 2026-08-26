"use client";

import { useState, type ReactElement } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  planSchema,
  type PlanInput,
  type PlanOutput,
} from "@/lib/validations/plan.schema";
import type { Plan } from "@/db/schema/plans";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "./plan-form-dialog.module.css";

const PERIOD_LABELS: Record<PlanInput["period"], string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

function defaultsFor(plan?: Plan): PlanInput {
  return plan
    ? { name: plan.name, price: Number(plan.price), period: plan.period }
    : { name: "", price: 0, period: "monthly" };
}

interface PlanFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  /** Omit to create a new plan; pass to edit an existing one. */
  plan?: Plan;
  onSaved: (plan: Plan) => void;
}

/**
 * Create/edit dialog for a Plan. Talks directly to app/api/v1/plans[/[id]]
 * via fetch (this project's chosen client-data pattern for Phase 1 — see
 * member-form-dialog.tsx, which mirrors it exactly).
 */
export function PlanFormDialog({ trigger, plan, onSaved }: PlanFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(plan);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanInput, unknown, PlanOutput>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultsFor(plan),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(defaultsFor(plan));
    }
  }

  async function onSubmit(values: PlanOutput) {
    setFormError(null);
    const res = await fetch(
      isEdit ? `/api/v1/plans/${plan!.id}` : "/api/v1/plans",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudo guardar el plan",
      );
      return;
    }

    const saved = (await res.json()) as Plan;
    onSaved(saved);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar plan" : "Nuevo plan"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos del plan."
              : "Creá un nuevo plan de membresía."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="plan-name">Nombre</Label>
            <Input
              id="plan-name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "plan-name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="plan-name-error" message={errors.name?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="plan-price">Precio</Label>
            <Input
              id="plan-price"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? "plan-price-error" : undefined}
              {...register("price")}
            />
            <FieldError id="plan-price-error" message={errors.price?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="plan-period">Periodicidad</Label>
            <Controller
              control={control}
              name="period"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="plan-period"
                    className={styles.selectTrigger}
                    aria-invalid={!!errors.period}
                    aria-describedby={errors.period ? "plan-period-error" : undefined}
                  >
                    {/* base-ui's Select.Value doesn't auto-derive a label
                        from the matching SelectItem's children (unlike
                        Radix) — it needs an explicit value->label mapping
                        function, or it renders the raw value. */}
                    <SelectValue placeholder="Seleccioná una periodicidad">
                      {(value: PlanInput["period"] | null) =>
                        value
                          ? PERIOD_LABELS[value]
                          : "Seleccioná una periodicidad"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError id="plan-period-error" message={errors.period?.message} />
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
