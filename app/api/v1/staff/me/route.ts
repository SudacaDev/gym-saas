import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { requireRole } from "@/lib/auth/require-role";
import { resolveOwnStaffMember } from "@/lib/staff/resolve-own-staff-member";
import { withTenantContext } from "@/db/rls-context";
import { schema } from "@/db/client";
import type { NewStaffMember } from "@/db/schema/staff-members";
import { staffProfileUpdateSchema } from "@/lib/validations/staff-profile.schema";
import { handleApiError } from "@/lib/api/handle-api-error";

// Self-service profile screen backend (T-20260826-009). Unlike
// app/api/v1/staff/[id]/route.ts (owner-only, edits anyone's HR record),
// this never takes an id — always "me", resolved from the session. There
// is deliberately no "cleaning" gate here (see
// lib/staff/resolve-own-staff-member.ts's docstring on the same pattern
// in T-20260826-007's attendance route): the UI (app/(owner)/profile/page.tsx)
// redirects cleaning staff away from the page entirely, but the API
// itself doesn't need to duplicate that as a hard block — it's their own
// data either way.
//
// email/password are NOT handled here — those go straight from the
// client to supabase.auth.updateUser() (see
// features/profile-page/components/profile-email-form.tsx and
// profile-password-form.tsx), since that's a Supabase Auth operation on
// the caller's own session, not a business-data write this route (or any
// server route) needs to broker.

export async function GET() {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    if (context.role !== "staff") {
      return NextResponse.json({ error: "No tenés un perfil de staff" }, { status: 404 });
    }

    const ownStaffMember = await resolveOwnStaffMember(context);
    if (!ownStaffMember) {
      return NextResponse.json({ error: "No se encontró tu perfil de staff" }, { status: 404 });
    }

    return NextResponse.json(ownStaffMember);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getTenantContext();
    requireRole(context, ["owner", "staff"]);

    if (context.role !== "staff") {
      return NextResponse.json({ error: "No tenés un perfil de staff" }, { status: 404 });
    }

    const ownStaffMember = await resolveOwnStaffMember(context);
    if (!ownStaffMember) {
      return NextResponse.json({ error: "No se encontró tu perfil de staff" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = staffProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // certifications/certificationExpiresAt only ever apply to
    // "instructor" — silently dropped for anyone else, same conditional
    // pattern app/api/v1/staff/route.ts's POST already uses per category.
    const updates: Partial<NewStaffMember> = {
      updatedAt: new Date(),
      phone: parsed.data.phone,
    };
    if (ownStaffMember.staffCategory === "instructor") {
      if (parsed.data.certifications !== undefined) {
        updates.certifications = parsed.data.certifications || null;
      }
      if (parsed.data.certificationExpiresAt !== undefined) {
        updates.certificationExpiresAt = parsed.data.certificationExpiresAt || null;
      }
    }

    const [updated] = await withTenantContext(context.tenantId, context.role, (tx) =>
      tx
        .update(schema.staffMembers)
        .set(updates)
        .where(eq(schema.staffMembers.id, ownStaffMember.id))
        .returning(),
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
