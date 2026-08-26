import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole, ForbiddenError } from "@/lib/auth/require-role";
import { resolveOwnStaffMember } from "@/lib/staff/resolve-own-staff-member";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { OwnerNav } from "./owner-nav";
import type { PresenceUser } from "./presence-widget";
import styles from "./layout.module.css";

/**
 * Server-side guard for the owner/staff work area. middleware.ts already
 * guarantees a signed-in, onboarded request reaches here with valid tenant
 * context (see get-tenant-context.ts) — this layer only adds the role
 * check middleware.ts doesn't do, since it has no concept of per-route
 * role requirements.
 *
 * "member" (or any other non-owner/staff role) is redirected to "/" — the
 * placeholder landing route, since there's no member-facing home yet.
 * owner vs. staff distinctions *within* this area (e.g. plan pricing is
 * owner-only, the staff roster is owner-only) are enforced per-operation
 * by each API route, not here — this guard only decides who gets past the
 * front door.
 */
export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await getTenantContext();

  try {
    requireRole(context, ["owner", "staff"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect("/");
    }
    throw error;
  }

  // The presence widget needs a display name for the current user, which
  // isn't part of TenantContext (that only carries the trust headers —
  // tenantId/role/the Supabase Auth id). context.userId is the Auth id, not
  // this tenant's local `users.id` row (same distinction documented in
  // app/api/v1/memberships/[id]/send-reminder/route.ts) — resolve it here,
  // once, server-side, instead of teaching the client to do it.
  const [localUser] = await withTenantContext(context.tenantId, context.role, (tx) =>
    tx
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.authUserId, context.userId)),
  );

  const displayName =
    [localUser?.firstName, localUser?.lastName].filter(Boolean).join(" ") ||
    localUser?.email ||
    "Vos";

  // Only staff has a staffMembers row to resolve a category from (T-20260826-009,
  // used by OwnerNav to decide "Mi perfil" visibility — cleaning doesn't get it).
  const category =
    context.role === "staff"
      ? ((await resolveOwnStaffMember(context))?.staffCategory ?? null)
      : null;

  const currentUser: PresenceUser = {
    id: localUser?.id ?? context.userId,
    name: displayName,
    role: context.role === "staff" ? "staff" : "owner",
    category,
  };

  return (
    <div className={styles.shell}>
      <OwnerNav tenantId={context.tenantId} currentUser={currentUser} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
