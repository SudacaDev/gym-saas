import { Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DAY_ORDER, DAY_LABELS_SHORT } from "../lib/day-labels";
import pageStyles from "../index.module.css";
import styles from "./schedule-table-skeleton.module.css";

// Fixed placeholder row count — the real row range is derived from loaded
// schedules' start/end times (see ScheduleTableView), so it can't be known
// yet while `loading` is true. Own call, not asked explicitly: 5 rows reads
// as "a plausible week" without over-filling the skeleton.
const PLACEHOLDER_ROWS = 5;

/**
 * Mirrors ScheduleTableView's real grid (day headers + day×hour cells) with
 * data-driven content swapped for skeleton bars — used only while
 * `useSchedules().loading` is true, before `schedules` resolves. Only
 * replicates the "Tabla" view (index.tsx's default), same call made for
 * gating the loading state before the view switch is known — see the gate
 * file for this task.
 */
export function ScheduleTableSkeleton() {
  return (
    <div className={pageStyles.weekWrap}>
      <div className={pageStyles.week}>
        <div className={pageStyles.cornerCell} />
        {DAY_ORDER.map((day) => (
          <div key={day} className={pageStyles.dayHeader}>
            {DAY_LABELS_SHORT[day]}
          </div>
        ))}

        {Array.from({ length: PLACEHOLDER_ROWS }, (_, rowIndex) => (
          <Fragment key={rowIndex}>
            <div className={pageStyles.timeLabel}>
              <Skeleton className={styles.timeLabel} />
            </div>
            {DAY_ORDER.map((day) => (
              <div key={day} className={pageStyles.cell}>
                <div className={pageStyles.slot}>
                  <Skeleton className={styles.slotTime} />
                  <Skeleton className={styles.slotActivity} />
                  <div className={pageStyles.slotActions}>
                    <Skeleton className={styles.actionBar} />
                    <Skeleton className={styles.actionBar} />
                    <Skeleton className={styles.actionBar} />
                  </div>
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
