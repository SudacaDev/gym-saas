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
import styles from "./catalog-table-skeleton.module.css";

const ROWS = 3;

/**
 * Mirrors KioskPage's "Catálogo" table (Nombre/Precio/icon-only Acciones)
 * with skeleton bars. Before this, the panel rendered nothing at all while
 * `loading` was true (both real blocks below the header were gated on
 * `!loading`), leaving the "Catálogo" heading sitting over an empty area
 * indistinguishable from "no products yet" — this fills that gap.
 */
export function CatalogTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Precio</TableHead>
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
              <Skeleton className={styles.priceCell} />
            </TableCell>
            <TableCell>
              <div className={pageStyles.catalogActions}>
                <Skeleton className={styles.iconButton} />
                <Skeleton className={styles.iconButton} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
