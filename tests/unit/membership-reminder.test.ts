import { describe, expect, it } from "vitest";
import { buildMembershipReminderEmail } from "@/lib/email/membership-reminder";
import { isDueForReminder, REMINDER_DAYS_BEFORE } from "@/lib/reminders/reminder-window";

describe("buildMembershipReminderEmail", () => {
  it("arma el asunto y el cuerpo interpolando los datos de la membresía", () => {
    const { subject, html } = buildMembershipReminderEmail({
      memberName: "Juana Pérez",
      memberEmail: "juana@example.com",
      tenantName: "BoxFlow Gym",
      planName: "Musculación Mensual",
      endDate: "2026-08-27",
    });

    expect(subject).toBe("Tu cuota en BoxFlow Gym vence el 27 ago 2026");
    expect(html).toContain("Juana Pérez");
    expect(html).toContain("BoxFlow Gym");
    expect(html).toContain("Musculación Mensual");
    expect(html).toContain("27 ago 2026");
  });
});

describe("isDueForReminder", () => {
  const now = new Date("2026-08-24T15:00:00Z");

  it(`es true cuando faltan exactamente ${REMINDER_DAYS_BEFORE} días para el vencimiento`, () => {
    expect(isDueForReminder("2026-08-27", now)).toBe(true);
  });

  it("es false un día antes de la ventana", () => {
    expect(isDueForReminder("2026-08-26", now)).toBe(false);
  });

  it("es false un día después de la ventana", () => {
    expect(isDueForReminder("2026-08-28", now)).toBe(false);
  });

  it("es false para una membresía que ya venció", () => {
    expect(isDueForReminder("2026-08-20", now)).toBe(false);
  });

  it("respeta un daysBefore custom", () => {
    expect(isDueForReminder("2026-08-25", now, 1)).toBe(true);
  });
});
