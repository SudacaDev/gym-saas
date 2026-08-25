import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewStaffMember } from "@/db/schema/staff-members";
import { staffMemberUpdateSchema } from "@/lib/validations/staff-member.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Owner-only, same tier as the POST that creates the account — editing HR
// data (DNI, emergency contact, category-specific fields, username) stays
// out of staff's own hands, same as they can't edit each other's records.
// `email`/`password` are NOT editable via this route — email is the
// account identity (unchanged from T-20260821-007), and a "reset
// password" action is a distinct, more sensitive flow left out of scope
// for this pass (see gate T-20260825-002).
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const body = await request.json();
    const parsed = staffMemberUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const updates: Partial<NewStaffMember> = { updatedAt: new Date() };
    if (parsed.data.staffCategory !== undefined) updates.staffCategory = parsed.data.staffCategory;
    if (parsed.data.username !== undefined) updates.username = parsed.data.username;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.dni !== undefined) updates.dni = parsed.data.dni;
    if (parsed.data.hireDate !== undefined) updates.hireDate = parsed.data.hireDate || null;
    if (parsed.data.emergencyContactName !== undefined)
      updates.emergencyContactName = parsed.data.emergencyContactName || null;
    if (parsed.data.emergencyContactPhone !== undefined)
      updates.emergencyContactPhone = parsed.data.emergencyContactPhone || null;
    if (parsed.data.specialties !== undefined) updates.specialties = parsed.data.specialties;
    if (parsed.data.certifications !== undefined)
      updates.certifications = parsed.data.certifications || null;
    if (parsed.data.certificationExpiresAt !== undefined)
      updates.certificationExpiresAt = parsed.data.certificationExpiresAt || null;
    if (parsed.data.department !== undefined) updates.department = parsed.data.department;
    if (parsed.data.shift !== undefined) updates.shift = parsed.data.shift;

    const [staffMember] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.staffMembers)
        .set(updates)
        .where(eq(schema.staffMembers.id, id))
        .returning(),
    );

    if (!staffMember) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    return NextResponse.json(staffMember);
  } catch (error) {
    return handleApiError(error);
  }
}

// Soft delete only — never a hard DELETE, since schedules/classes may
// reference this person (same convention as members). Does not touch the
// Supabase Auth account (kept out of scope; revoking auth access is a
// separate, more sensitive concern than hiding the HR record).
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner"]);

    const [staffMember] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.staffMembers)
        .set({ deletedAt: new Date() })
        .where(eq(schema.staffMembers.id, id))
        .returning(),
    );

    if (!staffMember) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
