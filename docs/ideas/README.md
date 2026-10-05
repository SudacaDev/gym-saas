# Ideas de producto — BoxFlow

Backlog de **ideas**, no de tareas. Nada de esto está comprometido ni en `tasks.md`; si una idea se aprueba,
se pasa a una tarea (`#task`) por separado. Antes de agregar una idea, buscarla acá y en `tasks.md`/`progress.md`
para no repetir.

| # | Idea | Esfuerzo | Schema | Ronda |
|---|------|----------|--------|-------|
| 1 | Importador de planilla (onboarding sin tipeo) | ~1 semana | no | [1](2026-10-05-ideas-nuevas.md) |
| 2 | Cierre de caja del día (método de pago + arqueo) | 3–4 días | sí | [1](2026-10-05-ideas-nuevas.md) |
| 3 | Socios que dejaron de venir (retención) | 2–3 días | no | [1](2026-10-05-ideas-nuevas.md) |
| 4 | Ajuste de precios por inflación | 3–4 días | sí | [2](2026-10-05-ronda-2.md) |
| 5 | Convertir prospecto en socio de un tap | 1–2 días | sí (chica) | [2](2026-10-05-ronda-2.md) |
| 6 | Planes por cantidad de clases | ~1 semana | sí | [2](2026-10-05-ronda-2.md) |
| 7 | Vencimiento del apto médico (alerta) | 2–3 días | sí (chica) | [3](2026-10-05-ronda-3.md) |
| 8 | Cumpleaños de la semana | 1–2 días | no | [3](2026-10-05-ronda-3.md) |
| 9 | Grilla de horarios pública (link/QR) | 4–6 días | sí (chica) | [3](2026-10-05-ronda-3.md) |
| 10 | Referidos: «vino de parte de…» | 1–2 días | sí (chica) | [4](#ronda-4) |
| 11 | Resumen del lunes por mail al dueño | 3–4 días | no | [4](#ronda-4) |
| 12 | País por box (moneda, documento, teléfono) | ~1 semana | sí (chica) | [4](#ronda-4) |

## Ya evaluadas / diferidas (no volver a proponer)

- Mercado Pago / cobro online — anotada en `.env.local.example`.
- Automatización por WhatsApp — diferida en `db/schema/leads.ts`.
- Credencial QR/NFC del socio — fuera de alcance en `app/api/v1/checkins/route.ts` mientras los socios no tengan login.
- Vista de deudores — gap ya registrado en el gate de T-20260826-014.
- Avisos de vencimiento por WhatsApp de un toque — ya propuesto en la rama `ideas/boxflow-2026-10` (IDEA-20261005-001).

## Ronda 4

Revisado antes de proponer: rondas 1–3, ramas `ideas/boxflow-2026-10` y `claude/ideas-negocio-boxflow`, `PRODUCT.md`,
`tasks.md` y `progress.md`. Ninguna repite lo anterior ni lo ya construido (pausa de membresía, cupos/lista de espera,
Cobro rápido, prospectos, ficha de salud, recordatorio de vencimiento por mail).

### 10. Referidos: «vino de parte de…»
- **Problema:** en un box, el boca a boca es el canal de venta principal, pero el dueño no sabe qué socios le traen gente ni
  cuántos prospectos llegan por recomendación. Hoy `leads` guarda nombre, WhatsApp y nota; el origen queda perdido.
- **Encaje:** una sola box = comunidad chica. Es un campo y un número, no un programa de fidelización de cadena ni un
  módulo de marketing. Cero curva: un selector opcional «¿lo trajo un socio?» al cargar el prospecto.
- **Alcance:** `referred_by_member_id` (nullable) en `leads` y `members`; se arrastra al convertir (idea 5). Ficha del socio
  muestra «trajo a N». No se calcula ni se aplica ningún descuento: el dueño decide el premio (no inventamos precios).
- **Esfuerzo:** 1–2 días. Migración chica con RLS ya cubierto por tenant, un selector y un contador.

### 11. Resumen del lunes por mail al dueño
- **Problema:** el dueño que está atendiendo la puerta no abre el dashboard todos los días. Los vencimientos de la semana
  y los socios en riesgo se enteran tarde.
- **Encaje:** «una mirada, una respuesta» llevado al mail: una pantalla corta con la cifra grande (ingresos de la semana),
  vencimientos próximos y check-ins. Sin reportes para estudiar ni configuración. Ya existen Resend, `email_send_log` y
  `vercel.json` para el cron.
- **Alcance:** cron semanal (lunes a la mañana, hora del box) que reutiliza las consultas del dashboard y manda un mail al
  owner. Opt-out en Mi perfil. Sin gráficos ni adjuntos.
- **Esfuerzo:** 3–4 días. Sin schema salvo el flag de opt-out; el trabajo es el template y el cron.

### 12. País por box: moneda, documento y teléfono
- **Problema:** `PRODUCT.md` dice que el producto debe extenderse a otros países hispanohablantes, pero hoy `es-AR`, ARS,
  DNI y el formato de WhatsApp están fijos en el código. El primer box de Chile, Uruguay o México no puede usarlo.
- **Encaje:** no es multi-país de cadena ni consola de administración: es un solo dato en el alta del box (país) del que
  se derivan moneda, locale, nombre del documento (DNI/RUT/CURP/cédula) y prefijo telefónico. Mantiene la voz con «vos»
  para AR y adapta el resto.
- **Alcance:** columna `country` en `tenants` (default AR) elegida en el onboarding; helper único de formato en `lib/`
  que reemplaza `Intl.NumberFormat("es-AR")` hardcodeado. Sin conversión de monedas, sin impuestos locales, sin precios por
  país (el precio sigue sin definirse).
- **Esfuerzo:** ~1 semana, la mayor parte es barrer los formatos hardcodeados y probar. Conviene hacerla antes de cualquier
  integración de cobro por país.

**Orden sugerido:** 11 (barata, usa lo que ya hay), 10 (barata, alimenta la idea 5) y 12 cuando haya un primer box
fuera de Argentina.
