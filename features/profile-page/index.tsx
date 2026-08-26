"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "../staff-page/types";
import { ProfileBusinessForm } from "./components/profile-business-form";
import { ProfilePasswordForm } from "./components/profile-password-form";
import { ProfileEmailForm } from "./components/profile-email-form";
import styles from "./index.module.css";
import { useProfile } from "./hooks/useProfile";

/**
 * Self-service "Mi perfil" (T-20260826-009) — only reachable by staff
 * whose category isn't "cleaning" (app/(owner)/profile/page.tsx redirects
 * anyone else away server-side before this ever mounts). "Clases" isn't a
 * section built here: the user confirmed it should have the exact same
 * scope ScheduleFormDialog already has today (owner+staff, no category
 * distinction) — that's already true on /schedules, so this just links
 * there instead of duplicating a second editor.
 */
export function ProfilePage() {
  const { profile, loading, error, setProfile } = useProfile();

  if (loading) {
    return <p className={styles.loadingText}>Cargando...</p>;
  }

  if (error || !profile) {
    return <p className={styles.errorText}>{error ?? "No se pudo cargar tu perfil"}</p>;
  }

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Mi perfil</h1>
        <p className={styles.subtitle}>
          {profile.firstName} {profile.lastName} · {CATEGORY_LABELS[profile.staffCategory]}
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Datos</h2>
        <ProfileBusinessForm profile={profile} onSaved={setProfile} />
      </section>

      {profile.staffCategory === "instructor" && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Clases</h2>
          <p className={styles.emptyText}>
            Ver y editar tus clases se hace desde Horarios, con el mismo acceso que ya tenías.
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/schedules" />}
          >
            Ir a Horarios
          </Button>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Email</h2>
        <ProfileEmailForm currentEmail={profile.email} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contraseña</h2>
        <ProfilePasswordForm />
      </section>
    </div>
  );
}
