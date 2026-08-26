"use client";

import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { paymentCreateSchema } from "@/lib/validations/payment.schema";
import type { Payment } from "@/db/schema/payments";
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
import styles from "./payment-form-dialog.module.css";

// The form only collects amount — membershipId is fixed to the member's
// current membership (from the detail page), not user input.
const paymentFormSchema = paymentCreateSchema.omit({ membershipId: true });
type PaymentFormInput = z.input<typeof paymentFormSchema>;
type PaymentFormOutput = z.output<typeof paymentFormSchema>;

function defaults(): PaymentFormInput {
  return { amount: 0 };
}

interface PaymentFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  membershipId: string;
  onSaved: (payment: Payment) => void;
}

/**
 * "Registrar pago" dialog: records a payment already collected in
 * cash/transfer at the counter (POST /api/v1/payments) against the
 * member's current membership. That endpoint also extends the
 * membership's endDate server-side — see lib/memberships/renewal.ts — so
 * the caller should refetch the membership list after onSaved fires.
 */
export function PaymentFormDialog({
  trigger,
  membershipId,
  onSaved,
}: PaymentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: defaults(),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(defaults());
    }
  }

  async function onSubmit(values: PaymentFormOutput) {
    setFormError(null);
    const res = await fetch("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, membershipId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string"
          ? body.error
          : "No se pudo registrar el pago",
      );
      return;
    }

    const saved = (await res.json()) as Payment;
    onSaved(saved);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Registrá un pago en efectivo o transferencia ya cobrado en el
            mostrador. Extiende automáticamente el vencimiento de la
            membresía según la periodicidad del plan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="payment-amount">Monto</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "payment-amount-error" : undefined}
              {...register("amount")}
            />
            <FieldError id="payment-amount-error" message={errors.amount?.message} />
          </div>
          {formError && (
            <p role="alert" className={styles.errorText}>
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
