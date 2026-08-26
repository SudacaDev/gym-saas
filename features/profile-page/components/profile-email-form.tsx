"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  staffEmailChangeSchema,
  type StaffEmailChangeInput,
} from "@/lib/validations/staff-profile.schema";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./profile-email-form.module.css";

interface ProfileEmailFormProps {
  currentEmail: string | null;
}

/**
 * Calls supabase.auth.updateUser({ email }) directly from the client, same
 * "operates on my own session" reasoning as profile-password-form.tsx.
 *
 * KNOWN GAP (T-20260826-009): unlike password, Supabase's default email
 * change does NOT apply immediately — it sends a confirmation link to the
 * new address and only updates auth.users.email once that's clicked. This
 * app has no /auth/callback route to catch that confirmation, and
 * db/schema/users.ts's `email` column (our local mirror, set once at
 * account creation) is NOT re-synced here after the fact — there's no
 * webhook wired up to know when Supabase actually applies the change. In
 * practice: the Auth login email does update once confirmed, but `users.email`
 * silently goes stale until something else re-syncs it. Flagged rather
 * than half-built into something that looks more finished than it is.
 */
export function ProfileEmailForm({ currentEmail }: ProfileEmailFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffEmailChangeInput>({
    resolver: zodResolver(staffEmailChangeSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: StaffEmailChangeInput) {
    setFormError(null);
    setSent(false);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: values.email });

    if (error) {
      setFormError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <p className={styles.currentEmail}>Email actual: {currentEmail ?? "—"}</p>
      <div className={styles.field}>
        <Label htmlFor="profile-new-email">Nuevo email</Label>
        <Input
          id="profile-new-email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        <FieldError id="profile-new-email-error" message={errors.email?.message} />
      </div>

      {formError && (
        <p role="alert" className={styles.errorText}>
          {formError}
        </p>
      )}
      {sent && !formError && (
        <p className={styles.successText}>
          Te mandamos un link de confirmación a la nueva dirección — el cambio no se aplica hasta que lo confirmes.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} size="sm">
        {isSubmitting ? "Enviando..." : "Cambiar email"}
      </Button>
    </form>
  );
}
