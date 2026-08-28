import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import pageStyles from "../index.module.css";
import formStyles from "./profile-business-form.module.css";
import styles from "./profile-skeleton.module.css";

/**
 * Mirrors ProfilePage's real layout (title, section headings, field
 * labels) with data-driven bars swapped in for skeleton — used only while
 * `loading` is true, before `profile` resolves. `profile.staffCategory`
 * isn't known yet at this point, so the instructor-only "Clases" section
 * and the certifications fields inside "Datos" aren't shown here — this
 * covers only the sections every role always gets (Datos/Teléfono, Email,
 * Contraseña), same "don't guess data we don't have yet" reasoning
 * member-detail-skeleton.tsx uses.
 */
export function ProfileSkeleton() {
  return (
    <div className={pageStyles.container}>
      <div>
        <h1 className={pageStyles.title}>Mi perfil</h1>
        <Skeleton className={styles.subtitle} />
      </div>

      <section className={pageStyles.section}>
        <h2 className={pageStyles.sectionTitle}>Datos</h2>
        <div className={formStyles.form}>
          <div className={formStyles.field}>
            <Label>Teléfono</Label>
            <Skeleton className={styles.input} />
          </div>
          <Skeleton className={styles.button} />
        </div>
      </section>

      <section className={pageStyles.section}>
        <h2 className={pageStyles.sectionTitle}>Email</h2>
        <div className={formStyles.form}>
          <Skeleton className={styles.currentEmail} />
          <div className={formStyles.field}>
            <Label>Nuevo email</Label>
            <Skeleton className={styles.input} />
          </div>
          <Skeleton className={styles.button} />
        </div>
      </section>

      <section className={pageStyles.section}>
        <h2 className={pageStyles.sectionTitle}>Contraseña</h2>
        <div className={formStyles.form}>
          <div className={formStyles.field}>
            <Label>Nueva contraseña</Label>
            <Skeleton className={styles.input} />
          </div>
          <div className={formStyles.field}>
            <Label>Confirmar contraseña</Label>
            <Skeleton className={styles.input} />
          </div>
          <Skeleton className={styles.button} />
        </div>
      </section>
    </div>
  );
}
