import { describe, expect, it } from "vitest";
import {
  getCurrentEffectiveStatus,
  getCurrentMembership,
  getEffectiveStatus,
} from "@/lib/memberships/status";

// Fixed "now" so these tests never flake around a real calendar boundary.
const NOW = new Date("2026-06-15T12:00:00Z");

function membership(overrides: {
  status: "active" | "paused" | "cancelled" | "expired";
  startDate: string;
  endDate: string | null;
  createdAt?: string;
}) {
  return { createdAt: overrides.startDate, ...overrides };
}

describe("getEffectiveStatus", () => {
  it("activa vigente: status active, endDate en el futuro -> active", () => {
    const m = membership({
      status: "active",
      startDate: "2026-06-01",
      endDate: "2026-07-01",
    });
    expect(getEffectiveStatus(m, NOW)).toBe("active");
  });

  it("activa en su último día (endDate === hoy) -> sigue active", () => {
    const m = membership({
      status: "active",
      startDate: "2026-05-15",
      endDate: "2026-06-15",
    });
    expect(getEffectiveStatus(m, NOW)).toBe("active");
  });

  it("activa vencida: status active, endDate en el pasado -> expired", () => {
    const m = membership({
      status: "active",
      startDate: "2026-04-01",
      endDate: "2026-05-01",
    });
    expect(getEffectiveStatus(m, NOW)).toBe("expired");
  });

  it("pausada: status paused, sin importar endDate -> paused", () => {
    const m = membership({
      status: "paused",
      startDate: "2026-04-01",
      endDate: "2026-05-01",
    });
    expect(getEffectiveStatus(m, NOW)).toBe("paused");
  });

  it("cancelada: status cancelled, aunque endDate sea futuro -> cancelled", () => {
    const m = membership({
      status: "cancelled",
      startDate: "2026-06-01",
      endDate: "2026-12-01",
    });
    expect(getEffectiveStatus(m, NOW)).toBe("cancelled");
  });

  it("activa sin endDate (nunca vence sola) -> active", () => {
    const m = membership({
      status: "active",
      startDate: "2026-06-01",
      endDate: null,
    });
    expect(getEffectiveStatus(m, NOW)).toBe("active");
  });
});

describe("getCurrentMembership / getCurrentEffectiveStatus", () => {
  it("sin membresía -> none", () => {
    expect(getCurrentEffectiveStatus([], NOW)).toBe("none");
    expect(getCurrentMembership([])).toBeNull();
  });

  it("elige la de startDate más reciente entre varias históricas", () => {
    const older = membership({
      status: "cancelled",
      startDate: "2025-01-01",
      endDate: "2025-02-01",
    });
    const newer = membership({
      status: "active",
      startDate: "2026-06-01",
      endDate: "2026-07-01",
    });
    const current = getCurrentMembership([older, newer]);
    expect(current).toBe(newer);
    expect(getCurrentEffectiveStatus([older, newer], NOW)).toBe("active");
  });

  it("desempata por createdAt cuando dos membresías comparten startDate", () => {
    const enteredFirst = membership({
      status: "cancelled",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      createdAt: "2026-06-01T09:00:00Z",
    });
    const enteredLast = membership({
      status: "active",
      startDate: "2026-06-01",
      endDate: "2026-07-01",
      createdAt: "2026-06-01T10:00:00Z",
    });
    expect(getCurrentMembership([enteredFirst, enteredLast])).toBe(
      enteredLast,
    );
  });

  it("una histórica vencida sigue reportando expired como estado actual si es la más reciente", () => {
    const onlyOne = membership({
      status: "active",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
    });
    expect(getCurrentEffectiveStatus([onlyOne], NOW)).toBe("expired");
  });
});
