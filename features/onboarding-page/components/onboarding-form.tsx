"use client";

import { useActionState } from "react";
import { createTenantAction, type OnboardingActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./onboarding-form.module.css";

const initialState: OnboardingActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createTenantAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <Label htmlFor="gymName">Nombre del gimnasio</Label>
        <Input
          id="gymName"
          name="gymName"
          required
          minLength={2}
          maxLength={120}
          autoFocus
          placeholder="Ej: PowerFit Gym"
        />
      </div>
      {state.error && (
        <p role="alert" className={styles.errorText}>
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className={styles.submitButton}>
        {pending ? "Creando..." : "Crear gimnasio"}
      </Button>
    </form>
  );
}
