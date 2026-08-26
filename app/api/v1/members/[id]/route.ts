import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewMember } from "@/db/schema/members";
import { memberSchema } from "@/lib/validations/member.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    // Soft-deleted members are treated as gone, same as a genuinely
    // missing/other-tenant id (RLS handles the tenant part) -> 404 either way.
    const [member] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .select()
          .from(schema.members)
          .where(
            and(eq(schema.members.id, id), isNull(schema.members.deletedAt)),
          ),
    );

    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const body = await request.json();
    const parsed = memberSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }

    const updates: Partial<NewMember> = { updatedAt: new Date() };
    if (parsed.data.firstName !== undefined)
      updates.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined)
      updates.lastName = parsed.data.lastName;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.birthDate !== undefined) updates.birthDate = parsed.data.birthDate;
    if (parsed.data.dni !== undefined) updates.dni = parsed.data.dni;
    if (parsed.data.medicalCertificateSubmitted !== undefined)
      updates.medicalCertificateSubmitted = parsed.data.medicalCertificateSubmitted;
    if (parsed.data.healthNotes !== undefined)
      updates.healthNotes = parsed.data.healthNotes;
    if (parsed.data.emailOptOut !== undefined)
      updates.emailOptOut = parsed.data.emailOptOut;

    const [member] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .update(schema.members)
          .set(updates)
          .where(
            and(eq(schema.members.id, id), isNull(schema.members.deletedAt)),
          )
          .returning(),
    );

    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    return handleApiError(error);
  }
}

// Soft delete only — never a real DELETE, so payment/checkin history tied
// to this member survives. See db/schema/members.ts's deletedAt docstring.
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    const [member] = await withTenantContext(
      context.tenantId,
      context.role,
      (tx) =>
        tx
          .update(schema.members)
          .set({ deletedAt: new Date() })
          .where(
            and(eq(schema.members.id, id), isNull(schema.members.deletedAt)),
          )
          .returning(),
    );

    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
