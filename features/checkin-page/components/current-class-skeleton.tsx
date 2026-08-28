import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import columnStyles from "./current-class-column.module.css";
import styles from "./current-class-skeleton.module.css";

function ReservedRowSkeleton() {
  return (
    <li className={columnStyles.row}>
      <Skeleton className={styles.rowName} />
      <div className={columnStyles.rowActions}>
        <Skeleton className={styles.rowButton} />
        <Skeleton className={styles.rowButton} />
      </div>
    </li>
  );
}

function PlainRowSkeleton() {
  return (
    <li className={columnStyles.row}>
      <Skeleton className={styles.rowName} />
      <Skeleton className={styles.rowPill} />
    </li>
  );
}

/**
 * Mirrors CurrentClassColumn's real panel layout (header with activity
 * name/time-range/capacity, then the "Reservados"/"Agregar reserva"/"Lista
 * de espera"/"Historial" sections it grew today) with skeleton bars for
 * everything that comes from `useCurrentClass()` — section titles stay
 * real static text (they don't depend on data), only the counts next to
 * them and each row are placeholders. Reuses `current-class-column.module
 * .css`'s classes so borders/radius/spacing match the real panel exactly
 * (same capped-radius container the real `.panel`/`.row` already use).
 */
export function CurrentClassSkeleton() {
  return (
    <div className={columnStyles.panel}>
      <div className={columnStyles.panelHeader}>
        <div>
          <Skeleton className={styles.activityName} />
          <Skeleton className={styles.timeRange} />
        </div>
        <Skeleton className={styles.capacity} />
      </div>

      <div className={columnStyles.section}>
        <h3 className={columnStyles.sectionTitle}>Reservados</h3>
        <ul className={columnStyles.list}>
          {Array.from({ length: 3 }, (_, i) => (
            <ReservedRowSkeleton key={i} />
          ))}
        </ul>
      </div>

      <div className={columnStyles.section}>
        <h3 className={columnStyles.sectionTitle}>Agregar reserva</h3>
        <Input placeholder="Buscar socio por nombre..." disabled />
      </div>

      <div className={columnStyles.section}>
        <h3 className={columnStyles.sectionTitle}>Lista de espera</h3>
        <ul className={columnStyles.list}>
          <PlainRowSkeleton />
        </ul>
      </div>

      <div className={columnStyles.section}>
        <h3 className={columnStyles.sectionTitle}>Historial</h3>
        <ul className={columnStyles.list}>
          <PlainRowSkeleton />
          <PlainRowSkeleton />
        </ul>
      </div>
    </div>
  );
}
