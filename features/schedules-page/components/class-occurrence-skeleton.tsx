import { Skeleton } from "@/components/ui/skeleton";
import dialogStyles from "./class-occurrence-dialog.module.css";
import styles from "./class-occurrence-skeleton.module.css";

const ROW_COUNTS = { reserved: 2, waitlisted: 1, history: 2 } as const;

function SkeletonRow({ actions }: { actions: "buttons" | "pill" }) {
  return (
    <li className={dialogStyles.row}>
      <Skeleton className={styles.name} />
      {actions === "buttons" ? (
        <div className={dialogStyles.rowActions}>
          <Skeleton className={styles.actionButton} />
          <Skeleton className={styles.actionButton} />
          <Skeleton className={styles.actionButton} />
        </div>
      ) : (
        <Skeleton className={styles.pill} />
      )}
    </li>
  );
}

/**
 * Mirrors ClassOccurrenceDialog's real "sections" content (Reservados/Lista
 * de espera/Agregar reserva/Historial — same section titles, real static
 * text) with skeleton bars standing in for member names, status pills and
 * per-row action buttons, none of which exist yet while `loading` is true —
 * see T-20260827-002 gate. Row counts are fixed placeholders (not derived
 * from real data, which isn't loaded yet); the "Historial" section is
 * always shown here even though the real one only renders when non-empty,
 * same call member-detail-skeleton made for its own always-shown sections.
 */
export function ClassOccurrenceSkeleton() {
  return (
    <div className={dialogStyles.sections}>
      <section className={dialogStyles.section}>
        <h3 className={dialogStyles.sectionTitle}>Reservados</h3>
        <ul className={dialogStyles.list}>
          {Array.from({ length: ROW_COUNTS.reserved }, (_, i) => (
            <SkeletonRow key={i} actions="buttons" />
          ))}
        </ul>
      </section>

      <section className={dialogStyles.section}>
        <h3 className={dialogStyles.sectionTitle}>Lista de espera</h3>
        <ul className={dialogStyles.list}>
          {Array.from({ length: ROW_COUNTS.waitlisted }, (_, i) => (
            <SkeletonRow key={i} actions="pill" />
          ))}
        </ul>
      </section>

      <section className={dialogStyles.section}>
        <h3 className={dialogStyles.sectionTitle}>Agregar reserva</h3>
        <Skeleton className={styles.input} />
      </section>

      <section className={dialogStyles.section}>
        <h3 className={dialogStyles.sectionTitle}>Historial</h3>
        <ul className={dialogStyles.list}>
          {Array.from({ length: ROW_COUNTS.history }, (_, i) => (
            <SkeletonRow key={i} actions="pill" />
          ))}
        </ul>
      </section>
    </div>
  );
}
