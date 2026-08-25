"use client";

import { useState, type ReactElement } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  staffMemberSchema,
  staffMemberUpdateSchema,
  STAFF_CATEGORIES,
  STAFF_SPECIALTIES,
  STAFF_DEPARTMENTS,
  STAFF_SHIFTS,
  type StaffMemberInput,
  type StaffMemberOutput,
} from "@/lib/validations/staff-member.schema";
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
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type StaffMemberRow } from "../types";
import styles from "./staff-form-dialog.module.css";

const SPECIALTY_LABELS: Record<(typeof STAFF_SPECIALTIES)[number], string> = {
  crossfit: "CrossFit",
  funcional: "Funcional",
  pesas: "Pesas",
  movilidad: "Movilidad",
  otro: "Otro",
};

const DEPARTMENT_LABELS: Record<(typeof STAFF_DEPARTMENTS)[number], string> = {
  reception: "Recepción",
  sales: "Ventas",
  billing: "Contabilidad/Cobranzas",
  management: "Gerencia",
};

const SHIFT_LABELS: Record<(typeof STAFF_SHIFTS)[number], string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  night: "Noche",
  rotating: "Rotativo",
};

function defaultsFor(member?: StaffMemberRow): StaffMemberInput {
  return member
    ? {
        firstName: member.firstName ?? "",
        lastName: member.lastName ?? "",
        email: member.email ?? "",
        username: member.username ?? "",
        // Never populated from server data (we don't store/return
        // passwords) — kept only so the shared create schema's type
        // requirement is satisfied. Not rendered in edit mode, so it's
        // never actually submitted (see staffMemberUpdateSchema, which
        // has no `password` field and strips it on parse).
        password: "",
        phone: member.phone ?? "",
        dni: member.dni ?? "",
        staffCategory: member.staffCategory,
        hireDate: member.hireDate ?? undefined,
        emergencyContactName: member.emergencyContactName ?? undefined,
        emergencyContactPhone: member.emergencyContactPhone ?? undefined,
        specialties: (member.specialties as StaffMemberInput["specialties"]) ?? undefined,
        certifications: member.certifications ?? undefined,
        certificationExpiresAt: member.certificationExpiresAt ?? undefined,
        department: member.department ?? undefined,
        shift: member.shift ?? undefined,
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        dni: "",
        staffCategory: "instructor",
        hireDate: undefined,
        emergencyContactName: undefined,
        emergencyContactPhone: undefined,
        specialties: [],
        certifications: undefined,
        certificationExpiresAt: undefined,
        department: undefined,
        shift: undefined,
      };
}

interface StaffFormDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  /** Omit to invite a new person; pass to edit an existing one. */
  member?: StaffMemberRow;
  onSaved: (member: StaffMemberRow) => void;
}

/**
 * Create/edit dialog for a StaffMember. As of T-20260825-002, create
 * (POST /api/v1/staff) collects a username + password directly in this
 * form — the owner defines the account's real login credential, no invite
 * email round-trip (replaces the T-20260821-007 invite flow). Edit (PATCH)
 * can't touch email (account identity) or password (reset is a separate,
 * out-of-scope flow — see the gate) — only `username` (display-only) and
 * the HR fields are editable there.
 */
export function StaffFormDialog({ trigger, member, onSaved }: StaffFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(member);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StaffMemberInput, unknown, StaffMemberOutput>({
    // Edit uses the update schema (no `password`/`email` requirement,
    // everything else optional) — cast to the create schema's type only
    // to satisfy useForm's generics, which are bound to the create shape;
    // the actual runtime validation behavior still comes from whichever
    // schema is picked here, so edit mode never requires a password.
    resolver: zodResolver(
      isEdit ? (staffMemberUpdateSchema as unknown as typeof staffMemberSchema) : staffMemberSchema,
    ),
    defaultValues: defaultsFor(member),
  });

  const staffCategory = watch("staffCategory");
  const specialties = watch("specialties") ?? [];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormError(null);
      reset(defaultsFor(member));
    }
  }

  async function onSubmit(values: StaffMemberOutput) {
    setFormError(null);
    const res = await fetch(isEdit ? `/api/v1/staff/${member!.id}` : "/api/v1/staff", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudo guardar a la persona",
      );
      return;
    }

    const saved = (await res.json()) as StaffMemberRow;
    onSaved(isEdit ? { ...member!, ...saved } : saved);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar persona" : "Invitar al equipo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos de esta persona."
              : "Definí el usuario y la contraseña con la que va a ingresar — no se manda ningún mail de invitación."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="staff-first-name">Nombre</Label>
              <Input
                id="staff-first-name"
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "staff-first-name-error" : undefined}
                {...register("firstName")}
              />
              <FieldError id="staff-first-name-error" message={errors.firstName?.message} />
            </div>
            <div className={styles.field}>
              <Label htmlFor="staff-last-name">Apellido</Label>
              <Input
                id="staff-last-name"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "staff-last-name-error" : undefined}
                {...register("lastName")}
              />
              <FieldError id="staff-last-name-error" message={errors.lastName?.message} />
            </div>
          </div>
          <div className={styles.field}>
            <Label htmlFor="staff-email">Email</Label>
            {isEdit ? (
              <p className={styles.staticValue}>{member!.email ?? "—"}</p>
            ) : (
              <Input
                id="staff-email"
                type="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "staff-email-error" : undefined}
                {...register("email")}
              />
            )}
            <FieldError id="staff-email-error" message={errors.email?.message} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="staff-username">Usuario</Label>
              <Input
                id="staff-username"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "staff-username-error" : undefined}
                {...register("username")}
              />
              <FieldError id="staff-username-error" message={errors.username?.message} />
            </div>
            {!isEdit && (
              <div className={styles.field}>
                <Label htmlFor="staff-password">Contraseña</Label>
                <Input
                  id="staff-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "staff-password-error" : undefined}
                  {...register("password")}
                />
                <FieldError id="staff-password-error" message={errors.password?.message} />
              </div>
            )}
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="staff-phone">Teléfono</Label>
              <Input
                id="staff-phone"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "staff-phone-error" : undefined}
                {...register("phone")}
              />
              <FieldError id="staff-phone-error" message={errors.phone?.message} />
            </div>
            <div className={styles.field}>
              <Label htmlFor="staff-dni">DNI</Label>
              <Input
                id="staff-dni"
                placeholder="12345678"
                aria-invalid={!!errors.dni}
                aria-describedby={errors.dni ? "staff-dni-error" : undefined}
                {...register("dni")}
              />
              <FieldError id="staff-dni-error" message={errors.dni?.message} />
            </div>
          </div>
          <div className={styles.field}>
            <Label htmlFor="staff-category">Categoría</Label>
            <Controller
              control={control}
              name="staffCategory"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="staff-category" className={styles.selectTrigger}>
                    <SelectValue placeholder="Elegí una categoría">
                      {(value: StaffMemberInput["staffCategory"] | null) =>
                        value ? CATEGORY_LABELS[value] : "Elegí una categoría"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {staffCategory === "instructor" && (
            <>
              <div className={styles.field}>
                <Label id="staff-specialties-label">Especialidades</Label>
                <div
                  role="group"
                  aria-labelledby="staff-specialties-label"
                  className={styles.chipGrid}
                >
                  {STAFF_SPECIALTIES.map((specialty) => {
                    const checked = specialties.includes(specialty);
                    return (
                      <Controller
                        key={specialty}
                        control={control}
                        name="specialties"
                        render={({ field }) => (
                          <button
                            type="button"
                            aria-pressed={checked}
                            className={cn(styles.chip, checked && styles.chipSelected)}
                            onClick={() => {
                              const current = field.value ?? [];
                              field.onChange(
                                checked
                                  ? current.filter((s) => s !== specialty)
                                  : [...current, specialty],
                              );
                            }}
                          >
                            {SPECIALTY_LABELS[specialty]}
                          </button>
                        )}
                      />
                    );
                  })}
                </div>
                <FieldError id="staff-specialties-error" message={errors.specialties?.message} />
              </div>
              <div className={styles.field}>
                <Label htmlFor="staff-certifications">Certificaciones</Label>
                <Input id="staff-certifications" {...register("certifications")} />
              </div>
              <div className={styles.field}>
                <Label htmlFor="staff-cert-expires">Vencimiento de certificación</Label>
                <Input
                  id="staff-cert-expires"
                  type="date"
                  {...register("certificationExpiresAt")}
                />
              </div>
            </>
          )}

          {staffCategory === "administrative" && (
            <div className={styles.field}>
              <Label htmlFor="staff-department">Área</Label>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="staff-department" className={styles.selectTrigger}>
                      <SelectValue placeholder="Elegí un área">
                        {(value: string | null) =>
                          value
                            ? DEPARTMENT_LABELS[value as keyof typeof DEPARTMENT_LABELS]
                            : "Elegí un área"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_DEPARTMENTS.map((department) => (
                        <SelectItem key={department} value={department}>
                          {DEPARTMENT_LABELS[department]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {staffCategory === "cleaning" && (
            <div className={styles.field}>
              <Label htmlFor="staff-shift">Turno habitual</Label>
              <Controller
                control={control}
                name="shift"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="staff-shift" className={styles.selectTrigger}>
                      <SelectValue placeholder="Elegí un turno">
                        {(value: string | null) =>
                          value ? SHIFT_LABELS[value as keyof typeof SHIFT_LABELS] : "Elegí un turno"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_SHIFTS.map((shift) => (
                        <SelectItem key={shift} value={shift}>
                          {SHIFT_LABELS[shift]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className={styles.field}>
            <Label htmlFor="staff-hire-date">Fecha de ingreso</Label>
            <Input id="staff-hire-date" type="date" {...register("hireDate")} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="staff-emergency-name">Contacto de emergencia</Label>
              <Input id="staff-emergency-name" {...register("emergencyContactName")} />
            </div>
            <div className={styles.field}>
              <Label htmlFor="staff-emergency-phone">Teléfono de emergencia</Label>
              <Input id="staff-emergency-phone" {...register("emergencyContactPhone")} />
            </div>
          </div>

          {formError && (
            <p role="alert" className={styles.errorText}>
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEdit ? "Guardar" : "Invitar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
