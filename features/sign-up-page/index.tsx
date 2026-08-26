import { SignUpForm } from "./components/sign-up-form";
import styles from "./index.module.css";

export function SignUpPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Creá tu cuenta
          </h1>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
