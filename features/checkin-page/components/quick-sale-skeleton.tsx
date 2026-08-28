import { Skeleton } from "@/components/ui/skeleton";
import columnStyles from "./quick-sale-column.module.css";
import styles from "./quick-sale-skeleton.module.css";

function ProductCardSkeleton() {
  return (
    <div className={columnStyles.card}>
      <Skeleton className={styles.name} />
      <Skeleton className={styles.price} />
      <Skeleton className={styles.button} />
    </div>
  );
}

/**
 * Mirrors the real product grid (`.grid`/`.card` in quick-sale-column
 * .module.css — name, price, sell button) with skeleton bars — used only
 * while `loading` is true, before `products` resolves. 4 cards fills the
 * same 2-column grid shape the real grid settles into for any catalog with
 * more than a couple of products.
 */
export function QuickSaleSkeleton() {
  return (
    <div className={columnStyles.grid}>
      {Array.from({ length: 4 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
