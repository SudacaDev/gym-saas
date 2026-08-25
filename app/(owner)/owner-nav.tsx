"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  CreditCardIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  ScanLineIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PresenceWidget, type PresenceUser } from "./presence-widget";
import styles from "./owner-nav.module.css";

// "Equipo" is owner-only: it's the staff roster (GET /api/v1/staff is
// enforced owner-only server-side too, see app/api/v1/staff/route.ts) —
// hiding the link keeps a staff user from even seeing it's there, same
// pattern dashboard-page/index.tsx uses to hide the revenue block.
const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, ownerOnly: false },
  { href: "/members", label: "Socios", icon: UsersIcon, ownerOnly: false },
  { href: "/staff", label: "Equipo", icon: IdCardIcon, ownerOnly: true },
  { href: "/plans", label: "Planes", icon: CreditCardIcon, ownerOnly: false },
  { href: "/schedules", label: "Horarios", icon: CalendarDaysIcon, ownerOnly: false },
  { href: "/checkin", label: "Check-in", icon: ScanLineIcon, ownerOnly: false },
] as const;

function DumbbellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.icon}
      aria-hidden="true"
    >
      <path d="M4 9v6" />
      <path d="M2 10v4" />
      <path d="M20 9v6" />
      <path d="M22 10v4" />
      <path d="M6 12h12" />
      <rect x="4" y="7" width="3" height="10" rx="1" />
      <rect x="17" y="7" width="3" height="10" rx="1" />
    </svg>
  );
}

interface OwnerNavProps {
  tenantId: string;
  currentUser: PresenceUser;
}

export function OwnerNav({ tenantId, currentUser }: OwnerNavProps) {
  const pathname = usePathname();
  const links = NAV_LINKS.filter((link) => !link.ownerOnly || currentUser.role === "owner");

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brandLink}>
        <DumbbellIcon />
        <span className={styles.brandLabel}>BoxFlow</span>
      </Link>
      <nav className={styles.nav}>
        <span className={styles.groupLabel}>Gestión</span>
        <ul className={styles.navList}>
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  title={link.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(styles.navLink, active && styles.navLinkActive)}
                >
                  <Icon className={styles.navIcon} aria-hidden="true" />
                  <span className={styles.navLabel}>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <PresenceWidget tenantId={tenantId} currentUser={currentUser} />
    </aside>
  );
}
