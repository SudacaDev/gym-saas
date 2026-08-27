import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { KioskPage } from "@/features/kiosk-page";

// Resolves role server-side (T-20260826-012) and hands it down — the
// "Ventas de hoy" total is revenue data (owner-only, same reasoning as
// dashboard-page hiding it from staff), while selling itself is owner+staff.
export default async function KioskRoute() {
  const context = await getTenantContext();
  return <KioskPage role={context.role === "owner" ? "owner" : "staff"} />;
}
