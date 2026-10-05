# Ideas de negocio / producto

> Registro de ideas propuestas (rutina de ideación). Antes de proponer ideas nuevas,
> leer este archivo para no repetir ninguna. Una idea pasa a `tasks.md` solo cuando el
> usuario la acepta. Estados: `propuesta` | `aceptada` | `descartada` (con motivo).

## 2026-10-05

### IDEA-20261005-001 — Avisos de vencimiento por WhatsApp con un toque
- tarea: T-20261005-001
- estado: propuesta (en backlog: ver tasks.md)
- problema: el recordatorio de vencimiento hoy sale solo por mail (`lib/email/membership-reminder.ts`); WhatsApp existe únicamente como campo en Prospectos.
- propuesta: lista "a quién avisar hoy" (vencen en N días o ya vencidos) con botón `wa.me` y mensaje prellenado en es-AR. Sin API ni WhatsApp Business.
- encaje: cero curva de aprendizaje, dueño solo en el mostrador, no es función de cadena. `members.phone` ya existe.
- esfuerzo: S (3-5 días)

### IDEA-20261005-002 — Importador de planilla ("de tu cuaderno a BoxFlow en 10 minutos")
- tarea: T-20261005-002
- estado: propuesta (en backlog: ver tasks.md)
- problema: la alta de socios es de a uno; migrar el cuaderno es la mayor barrera de entrada de un box nuevo.
- propuesta: importar socios, planes y vencimientos desde Excel/CSV/Google Sheets, con vista previa y detección de duplicados por DNI.
- encaje: reemplaza cuaderno y planillas sueltas (propósito central de PRODUCT.md).
- esfuerzo: M (1-2 semanas); cuidar validación de DNI y teléfono.

### IDEA-20261005-003 — Cobro de cuota por link/QR de Mercado Pago con conciliación automática
- tarea: T-20261005-003
- estado: propuesta (en backlog: ver tasks.md)
- problema: los pagos se cargan a mano.
- propuesta: el pago se registra solo (webhook) y el recibo sale por Resend.
- encaje: requisito probable en LatAm; la capa de pagos se adapta por país.
- esfuerzo: L (3-5 semanas): webhooks, idempotencia sobre pagos append-only, cuenta del box.
- dependencia: el modelo de precios sigue sin decidir (PRODUCT.md) — resolver antes de empezar.

Recomendación de orden: 001 → 002 → 003 (esta última tras definir precio).
