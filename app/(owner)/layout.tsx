import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole, ForbiddenError } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { OwnerNav } from "./owner-nav";
import type { PresenceUser } from "./presence-widget";
import styles from "./layout.module.css";

/**
 * Server-side guard for the owner-only area (Planes, Socios management).
 * middleware.ts already guarantees a signed-in, onboarded request reaches
 * here with valid tenant context (see get-tenant-context.ts) — this layer
 * only adds the role check middleware.ts doesn't do, since it has no
 * concept of per-route role requirements.
 *
 * A non-owner (staff/member) is redirected to "/" — the placeholder
 * landing route. There's no staff-facing home yet (out of scope for this
 * phase; /dashboard below is owner-only), so "/" is the only sane
 * fallback for them.
 */
export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await getTenantContext();

  try {
    requireRole(context, ["owner"]);
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

  const currentUser: PresenceUser = {
    id: localUser?.id ?? context.userId,
    name: displayName,
    role: context.role === "staff" ? "staff" : "owner",
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
