import { and, eq, isNull } from "drizzle-orm";
import type { TenantContext } from "@/lib/auth/get-tenant-context";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { StaffMember } from "@/db/schema/staff-members";

export interface OwnStaffMemberRow {
  id: string;
  staffCategory: StaffMember["staffCategory"];
  username: string;
  phone: string | null;
  certifications: string | null;
  certificationExpiresAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Resolves the caller's own staff_members row from their session
 * (users.authUserId = context.userId -> staffMembers.userId), or null if
 * they have none (owner, or a staff account mid-deletion). Shared by
 * anything that needs to know "who am I, as staff" rather than acting on
 * someone else's row by id:
 * - app/api/v1/staff/me/attendance/route.ts (T-20260826-007, self-service
 *   clock-in/out — only needs `.id`)
 * - app/api/v1/staff/route.ts's POST (T-20260826-008, gating who's allowed
 *   to create new staff accounts — only needs `.staffCategory`)
 * - app/(owner)/profile/page.tsx + app/api/v1/staff/me/route.ts
 *   (T-20260826-009, the self-service profile screen — needs the full row)
 *
 * Selects the full profile-relevant shape rather than a narrower per-caller
 * projection: same query either way, and it keeps this the single place
 * that knows how to join staffMembers -> users for "me".
 */
export async function resolveOwnStaffMember(
  context: TenantContext,
): Promise<OwnStaffMemberRow | null> {
  const [row] = await withTenantContext(context.tenantId, context.role, (tx) =>
    tx
      .select({
        id: schema.staffMembers.id,
        staffCategory: schema.staffMembers.staffCategory,
        username: schema.staffMembers.username,
        phone: schema.staffMembers.phone,
        certifications: schema.staffMembers.certifications,
        certificationExpiresAt: schema.staffMembers.certificationExpiresAt,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.staffMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.staffMembers.userId))
      .where(
        and(
          eq(schema.users.authUserId, context.userId),
          isNull(schema.staffMembers.deletedAt),
        ),
      ),
  );
  return row ?? null;
}
