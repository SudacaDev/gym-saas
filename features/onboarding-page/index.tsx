import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./components/onboarding-form";
import styles from "./index.module.css";

export async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const tenantId = (user.app_metadata as { tenant_id?: string }).tenant_id;
  if (tenantId) {
    // Already onboarded — nothing to do here. Owners land on the
    // dashboard; a non-owner (no such signup path exists yet, but the
    // (owner) layout's role guard would bounce them to "/" anyway) is
    // redirected there too rather than this page trying to know the role.
    redirect("/dashboard");
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Creá tu gimnasio
          </h1>
          <p className={styles.subtitle}>
            Un último paso antes de empezar.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
