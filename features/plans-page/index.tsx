"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plan } from "@/db/schema/plans";
import { Button } from "@/components/ui/button";
import { PlanFormDialog } from "./components/plan-form-dialog";
import styles from "./index.module.css";

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/plans");
      if (res.ok) {
        setPlans(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  function handleSaved(saved: Plan) {
    setError(null);
    setPlans((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [...prev, saved];
    });
  }

  async function handleDelete(plan: Plan) {
    setError(null);
    if (!confirm(`¿Borrar el plan "${plan.name}"?`)) return;

    const res = await fetch(`/api/v1/plans/${plan.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string" ? body.error : "No se pudo borrar el plan",
      );
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Planes</h1>
        <PlanFormDialog trigger={<Button>Nuevo plan</Button>} onSaved={handleSaved} />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
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
