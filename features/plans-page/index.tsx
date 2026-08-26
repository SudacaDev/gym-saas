"use client";

import type { Plan } from "@/db/schema/plans";
import { Button } from "@/components/ui/button";
import { PlanFormDialog } from "./components/plan-form-dialog";
import { PlanCardSkeleton } from "./components/plan-card-skeleton";
import styles from "./index.module.css";
import { usePlans } from "./hooks/usePlans";

const PERIOD_LABELS: Record<Plan["period"], string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const PERIOD_UNIT: Record<Plan["period"], string> = {
  monthly: "mes",
  quarterly: "trimestre",
  yearly: "año",
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function PlansPage() {
  const { plans, loading, error, handleSaved, handleDelete } = usePlans();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Planes</h1>
        <PlanFormDialog trigger={<Button>Nuevo plan</Button>} onSaved={handleSaved} />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }, (_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <p className={styles.emptyText}>Todavía no hay planes.</p>
      ) : (
        <div className={styles.grid}>
          {plans.map((plan) => (
            <div key={plan.id} className={styles.card}>
              <span className={styles.periodTag}>{PERIOD_LABELS[plan.period]}</span>
              <h2 className={styles.cardName}>{plan.name}</h2>
              <p className={styles.cardPrice}>
                {currencyFormatter.format(Number(plan.price))}
                <span className={styles.cardPriceUnit}>/{PERIOD_UNIT[plan.period]}</span>
              </p>
              <div className={styles.cardActions}>
                <PlanFormDialog
                  plan={plan}
                  trigger={
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  }
                  onSaved={handleSaved}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(plan)}
                >
                  Borrar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
