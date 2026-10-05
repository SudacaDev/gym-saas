# Ideas nuevas de producto — octubre 2026

Revisado contra `PRODUCT.md`, `.agents/graph/sessions/progress.md`, `tasks.md`, gates y knowledge graph. Ninguna de estas ideas figura como evaluada o descartada. Ya construido (no se repite): check-in (manual/QR/código), cupos y reservas, kiosco, prospectos, staff/permisos, recordatorios por mail, dashboard.

## 1. Importador de planilla (CSV/Excel) en el onboarding
- **Problema:** el box llega con su cuaderno o planilla y hoy carga los socios uno por uno; es la barrera de entrada real.
- **Encaje:** cero curva de aprendizaje; cumple literalmente "reemplaza cuaderno y planillas".
- **Esfuerzo:** S-M (3-5 días). Subir archivo, mapeo automático de columnas, previsualización, alta masiva de members y memberships.

## 2. WhatsApp de un toque para vencimientos y deudores
- **Problema:** en LatAm el dueño cobra por WhatsApp, no por mail. Hoy no hay forma de armar el mensaje desde la lista de quién vence o debe.
- **Encaje:** links `wa.me` con mensaje pre-armado (como ya hace Prospectos); lo envía una persona, sin API oficial ni costo por mensaje.
- **Esfuerzo:** S (2-4 días). Plantillas editables + botón en dashboard y ficha del socio.

## 3. Cobro de cuota por link/QR de Mercado Pago (cuenta del propio box)
- **Problema:** saber quién pagó sin transferencias a mano; el Payment se registra solo (append-only ya soportado).
- **Encaje:** el box cobra directo, BoxFlow no intermedia ni define precio, así no se decide el modelo de billing (indefinido según PRODUCT.md). Extensible a otros países.
- **Esfuerzo:** M-L (2-3 semanas). Conexión MP, webhook, conciliación; `webhook_events` ya existe en el schema.

**Orden recomendado:** 1, 2, 3.
