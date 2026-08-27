"use client";

import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadInput, type LeadOutput } from "@/lib/validations/lead.schema";
import type { Lead } from "@/db/schema/leads";
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
import styles from "./lead-form-dialog.module.css";

const DEFAULTS: LeadInput = { name: "", whatsapp: "", note: "" };

/**
 * Create dialog for a Lead (T-20260826-013) — mirrors ProductFormDialog's
 * shape. Create-only: no edit mode, no PATCH of name/whatsapp/note here —
 * the only post-creation action is the status change in features/leads-page's
 * table (PATCH /api/v1/leads/[id], status only).
 */
export function LeadFormDialog({
  trigger,
  onSaved,
}: {
  trigger: ReactElement;
  onSaved: (lead: Lead) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput, unknown, LeadOutput>({
    resolver: zodResolver(leadSchema),
    defaultValues: DEFAULTS,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(DEFAULTS);
    }
  }

  async function onSubmit(values: LeadOutput) {
    setFormError(null);
    const res = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudo guardar el prospecto",
      );
      return;
    }

    onSaved((await res.json()) as Lead);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo prospecto</DialogTitle>
          <DialogDescription>
            Nombre y WhatsApp de quien preguntó en el mostrador — arranca como &quot;Nuevo&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="lead-name">Nombre</Label>
            <Input
              id="lead-name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "lead-name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="lead-name-error" message={errors.name?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="lead-whatsapp">WhatsApp</Label>
            <Input
              id="lead-whatsapp"
              placeholder="11 2345 6789"
              aria-invalid={!!errors.whatsapp}
              aria-describedby={errors.whatsapp ? "lead-whatsapp-error" : undefined}
              {...register("whatsapp")}
            />
            <FieldError id="lead-whatsapp-error" message={errors.whatsapp?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="lead-note">Nota (opcional)</Label>
            <Input id="lead-note" {...register("note")} />
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
