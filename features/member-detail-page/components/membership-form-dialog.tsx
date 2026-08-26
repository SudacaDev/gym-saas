"use client";

import { useState, type ReactElement } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { membershipCreateSchema } from "@/lib/validations/membership.schema";
import type { Membership } from "@/db/schema/memberships";
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
import styles from "./membership-form-dialog.module.css";

// The form only collects planId/startDate — memberId comes from the page
// (the /members/[memberId] route param), not from user input, so it's
// left out of the schema used here and merged back in on submit.
const membershipFormSchema = membershipCreateSchema.omit({ memberId: true });
type MembershipFormInput = z.input<typeof membershipFormSchema>;
type MembershipFormOutput = z.output<typeof membershipFormSchema>;

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaults(plans: Plan[]): MembershipFormInput {
  return { planId: plans[0]?.id ?? "", startDate: todayDateOnly() };
}

interface MembershipFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  memberId: string;
  plans: Plan[];
  onSaved: (membership: Membership) => void;
}

/**
 * Create-only dialog for a Membership (POST /api/v1/memberships) — no
 * edit form: lifecycle changes (pause/cancel/reactivate) go through the
 * status action buttons on the detail page, which call PATCH
 * /api/v1/memberships/[id] directly. Same client-fetch pattern as
 * plan-form-dialog.tsx / member-form-dialog.tsx.
 */
export function MembershipFormDialog({
  trigger,
  memberId,
  plans,
  onSaved,
}: MembershipFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MembershipFormInput, unknown, MembershipFormOutput>({
    resolver: zodResolver(membershipFormSchema),
    defaultValues: defaults(plans),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(defaults(plans));
    }
  }

  async function onSubmit(values: MembershipFormOutput) {
    setFormError(null);
    const res = await fetch("/api/v1/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, memberId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string"
          ? body.error
          : "No se pudo crear la membresía",
      );
      return;
    }

    const saved = (await res.json()) as Membership;
    onSaved(saved);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva membresía</DialogTitle>
          <DialogDescription>
            Dá de alta una nueva membresía para este socio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="membership-plan">Plan</Label>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="membership-plan"
                    className={styles.selectTrigger}
                    aria-invalid={!!errors.planId}
                    aria-describedby={errors.planId ? "membership-plan-error" : undefined}
                  >
                    {/* base-ui's Select.Value doesn't auto-derive a label
                        from the matching SelectItem's children (unlike
                        Radix) — it needs an explicit value->label mapping
                        function, or it renders the raw plan id. */}
                    <SelectValue placeholder="Seleccioná un plan">
                      {(value: string | null) =>
                        plans.find((plan) => plan.id === value)?.name ??
                        "Seleccioná un plan"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError id="membership-plan-error" message={errors.planId?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="membership-start-date">Fecha de inicio</Label>
            <Input
              id="membership-start-date"
              type="date"
              aria-invalid={!!errors.startDate}
              aria-describedby={errors.startDate ? "membership-start-date-error" : undefined}
              {...register("startDate")}
            />
            <FieldError id="membership-start-date-error" message={errors.startDate?.message} />
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
