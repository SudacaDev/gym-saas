import { describe, expect, it } from "vitest";
import { computeRenewedEndDate } from "@/lib/memberships/renewal";

const TODAY = new Date("2026-06-15T12:00:00Z");

describe("computeRenewedEndDate", () => {
  it("mensual, sin endDate previo (primer pago) -> hoy + 1 mes", () => {
    expect(computeRenewedEndDate(null, "monthly", TODAY)).toBe("2026-07-15");
  });

  it("trimestral, sin endDate previo -> hoy + 3 meses", () => {
    expect(computeRenewedEndDate(null, "quarterly", TODAY)).toBe(
      "2026-09-15",
    );
  });

  it("anual, sin endDate previo -> hoy + 12 meses", () => {
    expect(computeRenewedEndDate(null, "yearly", TODAY)).toBe("2027-06-15");
  });

  it("endDate futuro (paga antes de vencer) -> extiende desde ese endDate, no desde hoy", () => {
    expect(computeRenewedEndDate("2026-06-30", "monthly", TODAY)).toBe(
      "2026-07-30",
    );
  });

  it("endDate ya vencido (pagó tarde) -> extiende desde hoy, no acumula el atraso", () => {
    expect(computeRenewedEndDate("2026-04-01", "monthly", TODAY)).toBe(
      "2026-07-15",
    );
  });

  it("endDate === hoy -> se trata como vencido, extiende desde hoy", () => {
    expect(computeRenewedEndDate("2026-06-15", "monthly", TODAY)).toBe(
      "2026-07-15",
    );
  });
});
