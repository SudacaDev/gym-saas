"use server";

import { redirect } from "next/navigation";
import { getDb, schema } from "@/db/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardingSchema } from "@/lib/validations/onboarding";

export interface OnboardingActionState {
  error?: string;
}

/**
 * Bootstrap path: creates the very first Tenant + owner User row for a
 * newly signed-up Supabase user, then stamps tenant_id/role onto their
 * app_metadata via the Admin API so middleware.ts can read it on the next
 * request. Plays the role the old Clerk `organization.created` webhook
 * handler used to — uses the raw db client (see db/client.ts docstring),
 * never withTenantContext, since there is no tenant context to set yet.
 */
export async function createTenantAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsed = onboardingSchema.safeParse({
    gymName: formData.get("gymName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const db = getDb();

  const [tenant] = await db
    .insert(schema.tenants)
    .values({ name: parsed.data.gymName })
    .returning({ id: schema.tenants.id });

  await db.insert(schema.users).values({
    tenantId: tenant.id,
    authUserId: user.id,
    role: "owner",
    email: user.email ?? null,
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { tenant_id: tenant.id, role: "owner" },
  });

  if (error) {
    return {
      error: `No se pudo completar el alta de la cuenta: ${error.message}`,
    };
  }

  redirect("/dashboard");
}
