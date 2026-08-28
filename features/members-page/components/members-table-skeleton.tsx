import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import pageStyles from "../index.module.css";
import styles from "./members-table-skeleton.module.css";

/**
 * Mirrors MembersPage's real table (same headers/columns, including the
 * "Estado" column added by the 2026-08-27 critique/polish pass) with
 * data-driven cells swapped for skeleton bars — used only while `loading`
 * is true, before `filteredMembers` resolves. 5 placeholder rows is an
 * arbitrary "looks like a full page" count, not tied to any real number.
 */
export function MembersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead className={pageStyles.actionsHead}>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            <TableCell>
              <Skeleton className={styles.name} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.pill} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.shortCode} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.email} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.phone} />
            </TableCell>
            <TableCell>
              <div className={pageStyles.actions}>
                <Skeleton className={styles.actionButton} />
                <Skeleton className={styles.actionButton} />
                <Skeleton className={styles.actionButtonWide} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
