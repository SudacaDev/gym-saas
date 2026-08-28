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
import styles from "./leads-table-skeleton.module.css";

const ROWS = 5;

/**
 * Mirrors LeadsPage's real table (same headers, same two-button Acciones
 * cell) with data-driven cells swapped for skeleton bars — used only while
 * `loading` is true, in place of the old plain "Cargando..." text. Header
 * and search input stay real above this (see index.tsx), only the table
 * itself is skeleton.
 */
export function LeadsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Nota</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className={pageStyles.actionsHead}>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: ROWS }, (_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className={styles.cell} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.cell} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.noteCell} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.dateCell} />
            </TableCell>
            <TableCell>
              <Skeleton className={styles.pill} />
            </TableCell>
            <TableCell>
              <div className={pageStyles.actions}>
                <Skeleton className={styles.actionButton} />
                <Skeleton className={styles.actionButton} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
