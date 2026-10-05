# Ideas de negocio/producto — BoxFlow

Registro de ideas ya propuestas, aprobadas o descartadas.

> **Regla:** quien genere ideas nuevas (persona o agente) lee primero `PRODUCT.md`,
> `.agents/graph/knowledge/`, `.agents/graph/sessions/progress.md`,
> `.agents/graph/sessions/tasks.md` (incluida la sección de descartadas) y **este archivo**.
> Si una idea ya figura acá, con cualquier estado, no se vuelve a proponer.
> Toda idea nueva se agrega acá al proponerla.

Filtro de encaje (de `PRODUCT.md`): un solo box, cero curva de aprendizaje, LatAm hispanohablante,
la puerta no espera. No inventar precios ni modelo de cobro: el precio sigue sin definir.

## Estados
`propuesta` · `aprobada` · `descartada` (con motivo) · `hecha` (con ID de tarea)

## Registro

### 2026-10-05

#### 1. Link de cobro de Mercado Pago al vencer la cuota — `propuesta`
- **Problema:** el owner persigue los pagos a mano.
- **Encaje:** `payments` ya tiene estado `pending` y `webhook_events` está reservada para una pasarela. Para el owner es un link, no un sistema nuevo.
- **Esfuerzo:** medio, 1-2 semanas. Preguntas abiertas: cómo conecta cada box su cuenta de Mercado Pago; sin comisión ni precio propio.

#### 2. Recordatorio por WhatsApp en un toque — `propuesta`
- **Problema:** los recordatorios actuales salen solo por email; el canal real en Argentina es WhatsApp.
- **Encaje:** desde la lista "por vencer" se abre `wa.me` con el mensaje armado. Sin API ni costo; `members.phone` ya existe.
- **Esfuerzo:** chico, 2-4 días.

#### 3. "Socios que dejaron de venir" — `propuesta`
- **Problema:** el owner pierde socios sin enterarse.
- **Encaje:** lista simple de socios activos sin check-in en 14 días o más, con el mensaje de WhatsApp a un toque. Usa `checkins` y `memberships`.
- **Esfuerzo:** chico, 3-5 días.
