"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { staffPasswordChangeSchema } from "@/lib/validations/staff-profile.schema";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./profile-password-form.module.css";

// `confirmPassword` only exists to catch typos in the UI — it's never
// sent anywhere, so the match check lives here rather than in the shared
// lib/validations/staff-profile.schema.ts schema.
const passwordFormSchema = staffPasswordChangeSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type PasswordFormInput = z.input<typeof passwordFormSchema>;

/**
 * Calls supabase.auth.updateUser() directly from the client — this is a
 * Supabase Auth operation on the caller's OWN session (unlike
 * app/api/v1/staff/route.ts's admin.auth.admin.createUser, which acts on
 * someone else's account and needs the service role), so there's no
 * server route to go through here. Takes effect immediately, no
 * confirmation email involved (unlike email changes — see
 * profile-email-form.tsx).
 */
export function ProfilePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormInput>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordFormInput) {
    setFormError(null);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setFormError(error.message);
      return;
    }

    reset({ password: "", confirmPassword: "" });
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <Label htmlFor="profile-new-password">Nueva contraseña</Label>
        <Input
          id="profile-new-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        <FieldError id="profile-new-password-error" message={errors.password?.message} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="profile-confirm-password">Confirmar contraseña</Label>
        <Input
          id="profile-confirm-password"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        <FieldError
          id="profile-confirm-password-error"
          message={errors.confirmPassword?.message}
        />
      </div>

      {formError && (
        <p role="alert" className={styles.errorText}>
          {formError}
        </p>
      )}
      {saved && !formError && <p className={styles.successText}>Contraseña actualizada.</p>}

      <Button type="submit" disabled={isSubmitting} size="sm">
        {isSubmitting ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
