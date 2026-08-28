import { Skeleton } from "@/components/ui/skeleton";
import pageStyles from "../index.module.css";
import styles from "./sell-grid-skeleton.module.css";

const TILES = 6;

/**
 * Mirrors KioskPage's "Vender" tile grid (name+price+cta) with skeleton
 * bars — used only while `loading` is true, in place of the old plain
 * "Cargando..." text. Reuses pageStyles.sellGrid for layout, but doesn't
 * reuse pageStyles.sellTile's interactive classes (hover/focus/active) —
 * these tiles are non-interactive placeholders, not real `<button>`s.
 */
export function SellGridSkeleton() {
  return (
    <div className={pageStyles.sellGrid}>
      {Array.from({ length: TILES }, (_, i) => (
        <div key={i} className={styles.tile}>
          <Skeleton className={styles.name} />
          <Skeleton className={styles.price} />
          <Skeleton className={styles.cta} />
        </div>
      ))}
    </div>
  );
}
