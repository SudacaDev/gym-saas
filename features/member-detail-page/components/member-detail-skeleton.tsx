import Link from "next/link";
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
import styles from "./member-detail-skeleton.module.css";

const INFO_LABELS = [
  "Código",
  "Email",
  "Teléfono",
  "Nacimiento",
  "DNI",
  "Certificado médico",
];

function SkeletonRows({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className={styles.cell} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Mirrors MemberDetailPage's real layout (same headings, labels and table
 * columns) with data-driven content swapped for skeleton bars — used only
 * while `loading` is true, before `member`/`memberships`/etc. resolve.
 */
export function MemberDetailSkeleton() {
  return (
    <div className={pageStyles.container}>
      <div>
        <Link href="/members" className={pageStyles.backLink}>
          ← Volver a socios
        </Link>
        <Skeleton className={styles.name} />
        <dl className={pageStyles.infoList}>
          {INFO_LABELS.map((label) => (
            <div key={label}>
              <dt className={pageStyles.infoLabel}>{label}: </dt>
              <dd className={pageStyles.infoValue}>
                <Skeleton className={styles.infoValue} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <section className={pageStyles.section}>
        <div className={pageStyles.sectionHeader}>
          <h2 className={pageStyles.sectionTitle}>Membresías</h2>
          <Skeleton className={styles.button} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className={pageStyles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SkeletonRows columns={5} />
          </TableBody>
        </Table>
      </section>

      <section className={pageStyles.section}>
        <div className={pageStyles.sectionHeader}>
          <h2 className={pageStyles.sectionTitle}>Pagos</h2>
          <Skeleton className={styles.button} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SkeletonRows columns={3} />
          </TableBody>
        </Table>
      </section>

      <section className={pageStyles.section}>
        <h2 className={pageStyles.sectionTitle}>Check-ins</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SkeletonRows columns={2} />
          </TableBody>
        </Table>
      </section>

      <section className={pageStyles.section}>
        <div className={pageStyles.sectionHeader}>
          <h2 className={pageStyles.sectionTitle}>Recordatorios</h2>
          <Skeleton className={styles.button} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SkeletonRows columns={3} />
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
