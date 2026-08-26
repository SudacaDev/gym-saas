"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import styles from "./presence-widget.module.css";

export interface PresenceUser {
  /** `users.id` (local business row) — NOT the Supabase Auth user id. */
  id: string;
  name: string;
  role: "owner" | "staff";
  /**
   * staffMembers.staffCategory, or null for an owner (no staffMembers
   * row). Only used by owner-nav.tsx to decide "Mi perfil" visibility
   * (T-20260826-009) — presence tracking/display itself doesn't care.
   */
  category?: "instructor" | "administrative" | "cleaning" | null;
}

interface PresenceWidgetProps {
  tenantId: string;
  currentUser: PresenceUser;
}

const ROLE_LABELS: Record<PresenceUser["role"], string> = {
  owner: "Dueño/a",
  staff: "Staff",
};

// Supabase's presenceState() return type tags every tracked payload with a
// presence_ref (its own internal dedup key) — strip it back down to the
// plain shape we track before it reaches component state.
type PresenceEntry = PresenceUser & { presence_ref: string };

/**
 * "Quién está conectado" — real-time presence of team members (owner/staff)
 * currently viewing the app, tracked via a Supabase Realtime Presence
 * channel scoped per-tenant (`presence:tenant:{tenantId}`) so two gyms'
 * rosters never mix. Every connected client tracks its own {id, name,
 * role} on mount; the "sync" event hands every subscriber the full merged
 * state (Supabase's own eventual-consistency mechanism), so no custom
 * WebSocket server or polling is needed here. This only ever mounts inside
 * the owner-only app shell (see layout.tsx's role guard) — members never
 * reach this component.
 *
 * Also hosts the sign-out control (paired with the presence list in the
 * original request): reuses the same `supabase.auth.signOut()` call the
 * sign-in form's client uses to establish a session in the first place.
 */
export function PresenceWidget({ tenantId, currentUser }: PresenceWidgetProps) {
  const router = useRouter();
  const [online, setOnline] = useState<PresenceUser[]>([currentUser]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:tenant:${tenantId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users = Object.values(state)
          .map((entries) => entries[0])
          .filter((entry): entry is PresenceEntry => Boolean(entry))
          .map(({ id, name, role }): PresenceUser => ({ id, name, role }));
        setOnline(users);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track(currentUser);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, currentUser]);

  async function handleSignOut() {
    setSigningOut(true);
    // Best-effort auto clock-out (T-20260826-007) — must run BEFORE
    // signOut() clears the session: getTenantContext() needs the still-
    // valid auth cookies to resolve who's clocking out. No-ops
    // server-side for non-staff.
    await fetch("/api/v1/staff/me/attendance", { method: "PATCH" }).catch(() => {});
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const sortedOnline = [...online].sort((a, b) => {
    if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={styles.footer}>
      <div>
        <span className={styles.groupLabel}>Conectados ({sortedOnline.length})</span>
        <ul className={styles.presenceList}>
          {sortedOnline.map((user) => (
            <li key={user.id} className={styles.presenceRow}>
              <span className={styles.onlineDot} aria-hidden="true" />
              <span className={styles.presenceName}>
                {user.name}
                {user.id === currentUser.id && (
                  <span className={styles.presenceYou}> (vos)</span>
                )}
              </span>
              <span className={styles.presenceRole}>{ROLE_LABELS[user.role]}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={styles.signOutButton}
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOutIcon aria-hidden="true" />
        <span className={styles.signOutLabel}>
          {signingOut ? "Saliendo..." : "Cerrar sesión"}
        </span>
      </Button>
    </div>
  );
}
