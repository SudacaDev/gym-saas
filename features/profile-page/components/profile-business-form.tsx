"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  staffProfileUpdateSchema,
  type StaffProfileUpdateInput,
  type StaffProfileUpdateOutput,
} from "@/lib/validations/staff-profile.schema";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StaffProfile } from "../types";
import styles from "./profile-business-form.module.css";

interface ProfileBusinessFormProps {
  profile: StaffProfile;
  onSaved: (profile: StaffProfile) => void;
}

/**
 * Phone (everyone) + certifications/certificationExpiresAt (instructor
 * only) — the only staff_members fields T-20260826-009 lets someone edit
 * on their own row. Everything else (DNI, category, emergency contact,
 * username) stays owner-only via app/api/v1/staff/[id]/route.ts, unchanged.
 */
export function ProfileBusinessForm({ profile, onSaved }: ProfileBusinessFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffProfileUpdateInput>({
    resolver: zodResolver(staffProfileUpdateSchema),
    defaultValues: {
      phone: profile.phone ?? "",
      certifications: profile.certifications ?? "",
      certificationExpiresAt: profile.certificationExpiresAt ?? "",
    },
  });

  async function onSubmit(values: StaffProfileUpdateOutput) {
    setFormError(null);
    setSaved(false);
    const res = await fetch("/api/v1/staff/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string" ? body.error : "No se pudieron guardar los cambios",
      );
      return;
    }

    onSaved(await res.json());
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <Label htmlFor="profile-phone">Teléfono</Label>
        <Input id="profile-phone" autoComplete="tel" {...register("phone")} />
        <FieldError id="profile-phone-error" message={errors.phone?.message} />
      </div>

      {profile.staffCategory === "instructor" && (
        <>
          <div className={styles.field}>
            <Label htmlFor="profile-certifications">Título / certificación</Label>
            <Input id="profile-certifications" {...register("certifications")} />
            <FieldError
              id="profile-certifications-error"
              message={errors.certifications?.message}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="profile-certification-expires">Vencimiento</Label>
            <Input
              id="profile-certification-expires"
              type="date"
              {...register("certificationExpiresAt")}
            />
            <FieldError
              id="profile-certification-expires-error"
              message={errors.certificationExpiresAt?.message}
            />
          </div>
        </>
      )}

      {formError && (
        <p role="alert" className={styles.errorText}>
          {formError}
        </p>
      )}
      {saved && !formError && <p className={styles.successText}>Guardado.</p>}

      <Button type="submit" disabled={isSubmitting} size="sm">
        {isSubmitting ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
