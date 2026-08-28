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
import styles from "./staff-table-skeleton.module.css";

/**
 * Mirrors StaffPage's real table (same headers/columns) with data-driven
 * cells swapped for skeleton bars — used only while `loading` is true,
 * before `filteredStaff` resolves. The actions column shows 3 generic bars
 * (Historial/Editar/Dar de baja) rather than the conditional 4th "Fichar"
 * button — that one only renders for `staffCategory === "cleaning"`, which
 * isn't known yet at skeleton time, so 3 is the majority-case shape.
 */
export function StaffTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Alta</TableHead>
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
              <Skeleton className={styles.email} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.category} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.pill} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.date} />
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
