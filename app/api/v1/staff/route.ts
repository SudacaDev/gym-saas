import { NextResponse } from "next/server";
import { eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { staffMemberSchema } from "@/lib/validations/staff-member.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

// Owner-only: the staff roster (names, contact info, DNI, category/shift)
// is HR data now scoped away from staff themselves, per an explicit
// permission-model change confirmed with the user (see gate
// T-20260825-001) — previously both owner and staff could read this list.
export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const rows = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .select({
          id: schema.staffMembers.id,
          userId: schema.staffMembers.userId,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          staffCategory: schema.staffMembers.staffCategory,
          phone: schema.staffMembers.phone,
          dni: schema.staffMembers.dni,
          hireDate: schema.staffMembers.hireDate,
          emergencyContactName: schema.staffMembers.emergencyContactName,
          emergencyContactPhone: schema.staffMembers.emergencyContactPhone,
          specialties: schema.staffMembers.specialties,
          certifications: schema.staffMembers.certifications,
          certificationExpiresAt: schema.staffMembers.certificationExpiresAt,
          department: schema.staffMembers.department,
          shift: schema.staffMembers.shift,
          createdAt: schema.staffMembers.createdAt,
          deletedAt: schema.staffMembers.deletedAt,
        })
        .from(schema.staffMembers)
        .innerJoin(schema.users, eq(schema.staffMembers.userId, schema.users.id))
        .where(isNull(schema.staffMembers.deletedAt)),
    );

    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

// Owner-only: creating a real Supabase Auth account is HR-sensitive, same
// tier as the money-adjacent owner-only writes elsewhere (plans POST).
//
// Transactional-with-compensation: the Supabase Auth account is created
// first (via invite, so the new hire sets their own password — the owner
// never handles it), then the local `users`/`staff_members` rows. If either
// DB insert fails, the just-created auth account is deleted so we never
// leave an orphaned Supabase Auth user with no matching business record.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const body = await request.json();
    const parsed = staffMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
    );

    if (inviteError || !invited?.user) {
      return NextResponse.json(
        { error: `No se pudo invitar la cuenta: ${inviteError?.message ?? "error desconocido"}` },
        { status: 400 },
      );
    }

    const authUserId = invited.user.id;

    try {
      const staffMember = await withTenantContext(context.tenantId, context.role, async (tx) => {
        const [userRow] = await tx
          .insert(schema.users)
          .values({
            tenantId: context.tenantId,
            authUserId,
            role: "staff",
            email: parsed.data.email,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
          })
          .returning();

        const [staffRow] = await tx
          .insert(schema.staffMembers)
          .values({
            tenantId: context.tenantId,
            userId: userRow.id,
            staffCategory: parsed.data.staffCategory,
            phone: parsed.data.phone,
            dni: parsed.data.dni,
            hireDate: parsed.data.hireDate || null,
            emergencyContactName: parsed.data.emergencyContactName || null,
            emergencyContactPhone: parsed.data.emergencyContactPhone || null,
            specialties:
              parsed.data.staffCategory === "instructor" ? parsed.data.specialties : null,
            certifications:
              parsed.data.staffCategory === "instructor"
                ? parsed.data.certifications || null
                : null,
            certificationExpiresAt:
              parsed.data.staffCategory === "instructor"
                ? parsed.data.certificationExpiresAt || null
                : null,
            department:
              parsed.data.staffCategory === "administrative" ? parsed.data.department : null,
            shift: parsed.data.staffCategory === "cleaning" ? parsed.data.shift : null,
          })
          .returning();

        return {
          ...staffRow,
          firstName: userRow.firstName,
          lastName: userRow.lastName,
          email: userRow.email,
        };
      });

      await admin.auth.admin.updateUserById(authUserId, {
        app_metadata: { tenant_id: context.tenantId, role: "staff" },
      });

      return NextResponse.json(staffMember, { status: 201 });
    } catch (dbError) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => {});
      throw dbError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
