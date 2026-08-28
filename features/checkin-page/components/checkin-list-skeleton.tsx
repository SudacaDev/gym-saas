import { Skeleton } from "@/components/ui/skeleton";
import pageStyles from "../index.module.css";
import styles from "./checkin-list-skeleton.module.css";

/**
 * Mirrors the real socio list (`.list`/`.listItem` in index.module.css —
 * name, short code, status pill, check-in/out button) with skeleton bars —
 * used only while `loading` is true, before `members`/`statusByMember`
 * resolve. Reuses `pageStyles.list`/`listItem`/`memberInfo` so the
 * placeholder inherits the same capped radius/border the real list uses
 * (see DESIGN.md Shapes note in index.module.css's `.list` comment).
 */
export function CheckinListSkeleton() {
  return (
    <ul className={pageStyles.list}>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className={pageStyles.listItem}>
          <div className={pageStyles.memberInfo}>
            <Skeleton className={styles.name} />
            <Skeleton className={styles.code} />
            <Skeleton className={styles.pill} />
          </div>
          <Skeleton className={styles.button} />
        </li>
      ))}
    </ul>
  );
}
