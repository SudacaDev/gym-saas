import { Skeleton } from "@/components/ui/skeleton";
import pageStyles from "../index.module.css";
import styles from "./plan-card-skeleton.module.css";

/**
 * Mirrors a real plan card's layout (periodTag/name/price/actions) with
 * skeleton bars — reuses pageStyles.card so it inherits the same capped
 * radius/border/padding as the real card (see DESIGN.md Shapes note in
 * index.module.css about T-20260825-010's oval-container bug).
 */
export function PlanCardSkeleton() {
  return (
    <div className={pageStyles.card}>
      <Skeleton className={styles.periodTag} />
      <Skeleton className={styles.name} />
      <Skeleton className={styles.price} />
      <div className={pageStyles.cardActions}>
        <Skeleton className={styles.button} />
        <Skeleton className={styles.button} />
      </div>
    </div>
  );
}
