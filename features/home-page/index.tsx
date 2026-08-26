import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./index.module.css";

const BENEFITS = [
  {
    title: "Se acabó el cuaderno",
    text: 'Alta de socios, planes y vencimientos, todo cargado una vez y visible siempre. Nada de fichas sueltas, nada de "¿quién pagó este mes?".',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6M9 16h6M8 4h8a2 2 0 0 1 2 2v13l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
        <path d="M4 4l16 16" />
      </svg>
    ),
  },
  {
    title: "El check-in que no se nota",
    text: "Tu socio llega, escanea, entra. El historial queda ahí solo. La fila en la puerta no se forma por vos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
      </svg>
    ),
  },
  {
    title: "Cero curva de aprendizaje",
    text: "Si sabés usar el teléfono, sabés usar BoxFlow. Lo manejás vos desde el mostrador, no un encargado de sistemas que no tenés.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  {
    title: "Tu caja, clara, siempre",
    text: "Ingresos del mes, socios activos, vencimientos que se vienen y check-ins de hoy. Un vistazo al abrir el box y ya sabés cómo estás parado.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </svg>
    ),
  },
];

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12" />
    </svg>
  );
}

export async function HomePage() {
  // "/" is a public route (see middleware.ts's PUBLIC_ROUTES) — it never
  // gets the x-tenant-id/x-user-role trust headers getTenantContext()
  // reads, so a signed-in visitor landing here still needs a direct check
  // to avoid showing them "Iniciar sesión"/"Quiero ver BoxFlow" for an
  // account they already have.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = user !== null;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <DumbbellIcon className={styles.brandIcon} />
          BoxFlow
        </div>
        <div className={styles.navActions}>
          {isSignedIn ? (
            <Link href="/dashboard" className={styles.navCta}>
              Ir al dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={styles.signInLink}>
                Iniciar sesión
              </Link>
              <Link href="/sign-up" className={styles.navCta}>
                Quiero ver BoxFlow
              </Link>
            </>
          )}
        </div>
      </nav>

      <header className={styles.hero}>
        <span className={styles.eyebrow}>Para boxes y estudios independientes</span>
        <h1 className={styles.heroTitle}>
          Tu box no necesita
          <br />
          un sistema para cadenas.
        </h1>
        <p className={styles.heroSubtitle}>
          BoxFlow es la gestión para boxes y estudios de una sola sede — CrossFit, funcional, pilates,
          yoga. Socios, pagos y check-in en un solo lugar, sin curso de sistemas para usarlo.
        </p>
        <div className={styles.heroActions}>
          {isSignedIn ? (
            <Link href="/dashboard" className={styles.heroCta}>
              Ir al dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-up" className={styles.heroCta}>
                Quiero ver BoxFlow
              </Link>
              <span className={styles.heroNote}>Sin tarjeta. Empezás en minutos.</span>
            </>
          )}
        </div>
      </header>

      <section className={styles.proof} aria-label="Producto real">
        <p className={styles.proofLabel}>Así se ve — producto real, no una maqueta</p>
        <div className={styles.proofGrid}>
          <div className={styles.browserFrame}>
            <div className={styles.browserBar}>
              <span className={styles.browserDot} />
              <span className={styles.browserDot} />
              <span className={styles.browserDot} />
              <span className={styles.browserUrl}>app.boxflow.com/dashboard</span>
            </div>
            <div className={styles.browserImageWrap}>
              <Image
                src="/screenshots/dashboard.jpg"
                alt="Dashboard de BoxFlow con ingresos del mes, socios activos, vencimientos y check-ins del día"
                width={1568}
                height={778}
                className={styles.browserImage}
              />
            </div>
          </div>
          <div className={styles.browserFrame}>
            <div className={styles.browserBar}>
              <span className={styles.browserDot} />
              <span className={styles.browserDot} />
              <span className={styles.browserDot} />
              <span className={styles.browserUrl}>app.boxflow.com/checkin</span>
            </div>
            <div className={styles.browserImageWrap}>
              <Image
                src="/screenshots/checkin.jpg"
                alt="Pantalla de check-in de BoxFlow con la lista de socios y estado de membresía"
                width={1568}
                height={778}
                className={styles.browserImage}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.benefits} aria-label="Beneficios">
        <div className={styles.benefitsGrid}>
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className={styles.benefitCard}>
              <span className={styles.benefitIcon}>{benefit.icon}</span>
              <h3 className={styles.benefitTitle}>{benefit.title}</h3>
              <p className={styles.benefitText}>{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.differentiation}>
        <p className={styles.differentiationLabel}>Por qué no somos como los demás</p>
        <p className={styles.differentiationText}>
          Hay sistemas hechos para cadenas con quince sedes, un departamento de IT y un manual de cien
          páginas. Vos no tenés nada de eso — tenés un box, una puerta, y socios que quieren entrar
          rápido y entrenar. BoxFlow no te vende funciones que nunca vas a tocar: resuelve exactamente
          lo que gestionás todos los días, sin la complejidad ni el precio de una herramienta que no
          fue pensada para vos.
        </p>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>
          Menos planilla.
          <br />
          Más box.
        </h2>
        {/* [PRECIO]: todavía no definimos el precio real — no inventarlo acá. */}
        <Link href={isSignedIn ? "/dashboard" : "/sign-up"} className={styles.heroCta}>
          {isSignedIn ? "Ir al dashboard" : "Empezar ahora"}
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <DumbbellIcon className={styles.footerIcon} />
          BoxFlow
        </div>
        <span className={styles.footerCopy}>© 2026 BoxFlow</span>
      </footer>
    </div>
  );
}
