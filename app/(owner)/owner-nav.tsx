"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  ScanLineIcon,
  ShoppingCartIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PresenceWidget, type PresenceUser } from "./presence-widget";
import styles from "./owner-nav.module.css";

// Each link decides its own visibility from the current user (role, and
// for "Mi perfil", category) instead of a single ownerOnly boolean — that
// stopped being expressive enough once T-20260826-009 needed a
// staff-and-category-specific link alongside the existing owner-only one.
//
// "Equipo" is owner-only: it's the staff roster (GET /api/v1/staff is
// enforced owner-only server-side too, see app/api/v1/staff/route.ts) —
// hiding the link keeps a staff user from even seeing it's there, same
// pattern dashboard-page/index.tsx uses to hide the revenue block.
//
// "Mi perfil" is staff-only, minus "cleaning" (T-20260826-007/-009: they
// don't self-service anything) — app/(owner)/profile/page.tsx enforces
// the same rule server-side, this is just keeping the link from even
// showing to someone who'd hit a redirect.
//
// Grouped into 3 sections (user request, 2026-08-26 — the list had grown
// to 10 flat items under one "Gestión" label): Gestión (back-office/admin
// config), User (people — socios/prospectos/la cuenta propia),
// Check & Payments (front-desk daily transactions). "Planes" stays in
// Check & Payments per the user's explicit call, not Gestión, despite
// being pricing config — confirmed, not a default.
const NAV_GROUPS = [
  {
    label: "Gestión",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, visible: () => true },
      {
        href: "/staff",
        label: "Equipo",
        icon: IdCardIcon,
        visible: (user: PresenceUser) => user.role === "owner",
      },
      { href: "/schedules", label: "Horarios", icon: CalendarDaysIcon, visible: () => true },
      {
        href: "/operational-requests",
        label: "Necesidades",
        icon: ClipboardListIcon,
        // Owner+staff — same tier as the rest of front-desk operational
        // data (T-20260826-010); no staffCategory/department restriction,
        // that axis is T-20260826-014 and isn't implemented yet.
        visible: () => true,
      },
    ],
  },
  {
    label: "User",
    links: [
      { href: "/members", label: "Socios", icon: UsersIcon, visible: () => true },
      { href: "/leads", label: "Prospectos", icon: UserPlusIcon, visible: () => true },
      {
        href: "/profile",
        label: "Mi perfil",
        icon: UserIcon,
        visible: (user: PresenceUser) => user.role === "staff" && user.category !== "cleaning",
      },
    ],
  },
  {
    label: "Check & Payments",
    links: [
      { href: "/checkin", label: "Check-in", icon: ScanLineIcon, visible: () => true },
      { href: "/kiosk", label: "Cobro rápido", icon: ShoppingCartIcon, visible: () => true },
      { href: "/plans", label: "Planes", icon: CreditCardIcon, visible: () => true },
    ],
  },
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

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brandLink}>
        <DumbbellIcon />
        <span className={styles.brandLabel}>BoxFlow</span>
      </Link>
      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => {
          const links = group.links.filter((link) => link.visible(currentUser));
          // A group can end up empty for a given role (e.g. "Gestión" minus
          // "Equipo" for non-owners still has other links today, but this
          // guards future additions from leaving a bare, link-less header).
          if (links.length === 0) return null;

          return (
            <div key={group.label}>
              <span className={styles.groupLabel}>{group.label}</span>
              <ul className={styles.navList}>
                {links.map((link) => {
                  const active =
                    pathname === link.href || pathname.startsWith(`${link.href}/`);
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
            </div>
          );
        })}
      </nav>
      <PresenceWidget tenantId={tenantId} currentUser={currentUser} />
    </aside>
  );
}
