"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./sign-up-form.module.css";

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(values: SignUpInput) {
    setFormError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp(values);

    if (error) {
      setFormError(error.message);
      return;
    }

    // Email confirmation may be required depending on the Supabase
    // project's Auth settings — if there's no session yet, the user still
    // needs to confirm their email before they can sign in.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <p className={styles.footerText}>
        Te enviamos un email para confirmar tu cuenta. Una vez confirmada,
        podés{" "}
        <Link href="/sign-in" className={styles.footerLink}>
          ingresar
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>
      {formError && (
        <p role="alert" className={styles.errorText}>
          {formError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
      <p className={styles.footerText}>
        ¿Ya tenés cuenta?{" "}
        <Link href="/sign-in" className={styles.footerLink}>
          Ingresá
        </Link>
      </p>
    </form>
  );
}
