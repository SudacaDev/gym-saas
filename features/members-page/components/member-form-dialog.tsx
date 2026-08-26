"use client";

import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  memberSchema,
  type MemberInput,
  type MemberOutput,
} from "@/lib/validations/member.schema";
import type { Member } from "@/db/schema/members";
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
import styles from "./member-form-dialog.module.css";

function defaultsFor(member?: Member): MemberInput {
  return member
    ? {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email ?? undefined,
        phone: member.phone ?? undefined,
        birthDate: member.birthDate ?? undefined,
        dni: member.dni ?? undefined,
        medicalCertificateSubmitted: member.medicalCertificateSubmitted,
        healthNotes: member.healthNotes ?? undefined,
        emailOptOut: member.emailOptOut,
      }
    : {
        firstName: "",
        lastName: "",
        email: undefined,
        phone: undefined,
        birthDate: undefined,
        dni: undefined,
        medicalCertificateSubmitted: false,
        healthNotes: undefined,
        emailOptOut: false,
      };
}

interface MemberFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  /** Omit to create a new member; pass to edit an existing one. */
  member?: Member;
  onSaved: (member: Member) => void;
}

/**
 * Create/edit dialog for a Member. Talks directly to
 * app/api/v1/members[/[id]] via fetch — same client-data pattern as
 * plan-form-dialog.tsx, kept consistent across both resources.
 */
export function MemberFormDialog({
  trigger,
  member,
  onSaved,
}: MemberFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(member);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberInput, unknown, MemberOutput>({
    resolver: zodResolver(memberSchema),
    defaultValues: defaultsFor(member),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(defaultsFor(member));
    }
  }

  async function onSubmit(values: MemberOutput) {
    setFormError(null);
    const res = await fetch(
      isEdit ? `/api/v1/members/${member!.id}` : "/api/v1/members",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudo guardar el socio",
      );
      return;
    }

    const saved = (await res.json()) as Member;
    onSaved(saved);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar socio" : "Nuevo socio"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos del socio."
              : "Dá de alta un nuevo socio."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="member-first-name">Nombre</Label>
            <Input
              id="member-first-name"
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? "member-first-name-error" : undefined}
              {...register("firstName")}
            />
            <FieldError id="member-first-name-error" message={errors.firstName?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="member-last-name">Apellido</Label>
            <Input
              id="member-last-name"
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? "member-last-name-error" : undefined}
              {...register("lastName")}
            />
            <FieldError id="member-last-name-error" message={errors.lastName?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "member-email-error" : undefined}
              {...register("email")}
            />
            <FieldError id="member-email-error" message={errors.email?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="member-phone">Teléfono</Label>
            <Input
              id="member-phone"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "member-phone-error" : undefined}
              {...register("phone")}
            />
            <FieldError id="member-phone-error" message={errors.phone?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="member-birth-date">Fecha de nacimiento</Label>
            <Input
              id="member-birth-date"
              type="date"
              aria-invalid={!!errors.birthDate}
              aria-describedby={errors.birthDate ? "member-birth-date-error" : undefined}
              {...register("birthDate")}
            />
            <FieldError id="member-birth-date-error" message={errors.birthDate?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="member-dni">DNI</Label>
            <Input
              id="member-dni"
              placeholder="12345678"
              aria-invalid={!!errors.dni}
              aria-describedby={errors.dni ? "member-dni-error" : undefined}
              {...register("dni")}
            />
            <FieldError id="member-dni-error" message={errors.dni?.message} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="member-health-notes">Notas de salud</Label>
            <textarea
              id="member-health-notes"
              rows={3}
              placeholder="Alergias, condiciones a tener en cuenta, etc."
              className={styles.textarea}
              aria-invalid={!!errors.healthNotes}
              aria-describedby={errors.healthNotes ? "member-health-notes-error" : undefined}
              {...register("healthNotes")}
            />
            <FieldError id="member-health-notes-error" message={errors.healthNotes?.message} />
          </div>
          <Label className={styles.checkboxField}>
            <input
              type="checkbox"
              className={styles.checkbox}
              {...register("medicalCertificateSubmitted")}
            />
            Presentó el certificado médico
          </Label>
          <Label className={styles.checkboxField}>
            <input
              type="checkbox"
              className={styles.checkbox}
              {...register("emailOptOut")}
            />
            No enviar recordatorios de vencimiento por email
          </Label>
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
