import { NextResponse } from "next/server";
import { eq, isNull, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole, ForbiddenError } from "@/lib/auth/require-role";
import { resolveOwnStaffMember } from "@/lib/staff/resolve-own-staff-member";
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
          username: schema.staffMembers.username,
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
          // T-20260825-005: this person's currently-open (not-yet-clocked-out)
          // staff_attendance row id, if any — a scalar correlated subquery
          // instead of N calls to GET /api/v1/staff/[id]/attendance (one
          // per row rendered). Chosen over a plain boolean because the
          // "Fichar salida" row action needs this exact id to PATCH
          // /api/v1/staff/[id]/attendance/[attendanceId] directly, so this
          // also saves a "fetch the open row first" round-trip on click.
          openAttendanceId: sql<string | null>`(
            SELECT ${schema.staffAttendance.id} FROM ${schema.staffAttendance}
            WHERE ${schema.staffAttendance.staffMemberId} = ${schema.staffMembers.id}
              AND ${schema.staffAttendance.clockOut} IS NULL
            LIMIT 1
          )`,
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

// Owner, or a staff member whose OWN staffCategory is "administrative"
// (T-20260826-008 — confirmed with the user: the gate is having that
// category, not an allowlist of which categories an administrative can
// create; they can create any category, including another administrative
// account). Creating a real Supabase Auth account is still HR-sensitive,
// same tier as the money-adjacent owner-only writes elsewhere (plans
// POST) — this widens WHO can do it, not how carefully it's done.
//
// requireRole() alone can't express "staff, but only this category" (it
// only knows about role, not staffCategory), so the category check is a
// second gate here via resolveOwnStaffMember() — same helper
// app/api/v1/staff/me/attendance/route.ts uses to resolve "who am I".
//
// NOTE: this only widens the create endpoint. GET /api/v1/staff (the
// roster) and the "Equipo" nav link stay owner-only (T-20260825-001) —
// an administrative staff member can call this POST directly, but has no
// UI entry point to reach it yet (no "Invitar" button visible to them).
// Deliberately not addressed here: it's staffCategory-scoped visibility,
// the same kind of "role+category" permission modeling T-20260826-014
// scopes out as its own discussion, not assumed as a side effect of this
// task.
//
// As of T-20260825-002, whoever creates the account defines its
// email+password directly in the form (admin.auth.admin.createUser,
// email_confirm: true) — this REPLACES the invite-by-email design from
// T-20260821-007, where Supabase sent an invite and the new hire set
// their own password. The creator now knows the employee's credential, a
// known security tradeoff confirmed explicitly by the user (see gate
// T-20260825-002) — now also true for an administrative creator, not
// just the owner. Login stays single-factor (email+password) — no design
// choice here hardcodes that assumption in a way that would block adding
// 2FA later; 2FA itself is out of scope for this pass.
//
// Transactional-with-compensation: the Supabase Auth account is created
// first, then the local `users`/`staff_members` rows. If either DB insert
// fails, the just-created auth account is deleted so we never leave an
// orphaned Supabase Auth user with no matching business record.
export async function POST(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    if (context.role === "staff") {
      const ownStaffMember = await resolveOwnStaffMember(context);
      if (ownStaffMember?.staffCategory !== "administrative") {
        throw new ForbiddenError(context.role, ["owner"]);
      }
    }

    const body = await request.json();
    const parsed = staffMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      return NextResponse.json(
        { error: `No se pudo crear la cuenta: ${createError?.message ?? "error desconocido"}` },
        { status: 400 },
      );
    }

    const authUserId = created.user.id;

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
            username: parsed.data.username,
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
