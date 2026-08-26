import { Suspense } from "react";
import { SignInForm } from "./components/sign-in-form";
import styles from "./index.module.css";

export function SignInPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Ingresá a tu cuenta
          </h1>
        </div>
        {/* useSearchParams (for redirect_to) requires a Suspense boundary
            when the parent route segment doesn't otherwise force one. */}
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
