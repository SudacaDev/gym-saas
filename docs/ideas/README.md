# Ideas de producto — BoxFlow

Backlog de **ideas**, no de tareas. Nada de esto está comprometido ni en `tasks.md`; si una idea se aprueba,
se pasa a una tarea (`#task`) por separado. Antes de agregar una idea, buscarla acá y en `tasks.md`/`progress.md`
para no repetir.

**Regla:** quien genere ideas nuevas (persona o agente) lee primero `PRODUCT.md`, `.agents/graph/knowledge/`,
`progress.md`, `tasks.md` (incluidas las descartadas) y **este archivo**. Una idea que ya figura acá, en cualquier
estado, no se vuelve a proponer. Toda idea nueva se agrega acá al proponerla. Este es el único registro de ideas.

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
| 13 | «Cuánto me queda»: gastos fijos y resultado del mes | 3–4 días | sí | [5](#ronda-5) |
| 14 | Alta por QR en el mostrador (el socio se carga solo) | ~1 semana | sí (chica) | [5](#ronda-5) |
| 15 | Check-in que sigue andando sin internet | 1–2 semanas | no | [5](#ronda-5) |
| 16 | «El box cierra»: feriado/receso con extensión de vencimientos | 3–4 días | no (opcional) | [6](2026-10-05-ronda-6.md) |
| 17 | Exportar a Excel para el contador | 1–2 días | no | [6](2026-10-05-ronda-6.md) |
| 18 | Motivo de baja en un toque | 2 días | sí (chica) | [6](2026-10-05-ronda-6.md) |

## Ya evaluadas / diferidas (no volver a proponer)

- Mercado Pago / cobro online — anotada en `.env.local.example`.
- Automatización por WhatsApp — diferida en `db/schema/leads.ts`.
- Credencial QR/NFC del socio — fuera de alcance en `app/api/v1/checkins/route.ts` mientras los socios no tengan login.
- Vista de deudores — gap ya registrado en el gate de T-20260826-014.
- Avisos de vencimiento por WhatsApp de un toque — propuesto en 3 ramas distintas (IDEA-20261005-001 y `claude/ideas-negocio-boxflow`). Pendiente de decidir; no volver a proponerlo.
- Importador de planilla — ya es la idea 1 de este registro (también propuesto como IDEA-20261005-002).
- Cobro por link/QR de Mercado Pago — propuesto otra vez como IDEA-20261005-003; sigue condicionado a definir el modelo de precios.

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

## Ronda 5

Revisado antes de proponer: rondas 1–4, ramas `ideas/boxflow-2026-10` y `claude/ideas-negocio-boxflow`, `PRODUCT.md`,
`tasks.md`, `progress.md` y el código. Verificado: no hay gastos, offline/service worker ni alta por autoservicio del
socio. Solo son ideas; no están en `tasks.md` ni se implementó nada.

### 13. «Cuánto me queda»: gastos fijos y resultado del mes
- **Problema:** el dashboard muestra lo que entra, pero el dueño de un solo box piensa en lo que le queda después de
  alquiler, sueldos y servicios. Hoy lo calcula aparte, en un cuaderno.
- **Encaje:** una sola cifra de gastos fijos del mes, no contabilidad ni reportes. Distinta del cierre de caja (idea 2),
  que mira entradas del día. Principio 4: va como dato secundario bajo el número de ingresos, sin competir con él.
- **Alcance:** tabla `fixed_expenses` (concepto, monto mensual) con RLS por tenant; resultado estimado = ingresos del mes
  menos gastos cargados. Visible solo para `owner` (mismo criterio que T-20260821-006). Sin categorías ni impuestos.
- **Esfuerzo:** 3–4 días. Migración (gate `high`), un diálogo de carga y una línea en el dashboard.

### 14. Alta por QR en el mostrador
- **Problema:** recepción tipea nombre, DNI, ficha de salud y teléfono de cada socio nuevo, con la persona esperando.
- **Encaje:** el socio completa sus datos desde su celular y recepción solo confirma. Cero curva y sin crear cuentas: los
  socios siguen sin login, el acceso es un token de un solo uso con vencimiento corto.
- **Alcance:** ruta pública acotada que crea un alta pendiente; recepción la ve y la aprueba. Incluye aceptación de
  deslinde/consentimiento (guardar fecha de aceptación). Dato sensible: misma regla de acceso que hoy (Ley 25.326).
- **Esfuerzo:** ~1 semana. Migración chica (consentimiento, estado pendiente) con gate `high`; lo delicado es exponer
  solo ese endpoint saltando RLS de forma segura y evitar spam.

### 15. Check-in que sigue andando sin internet
- **Problema:** si el wifi del box se cae, la puerta se frena y se rompe el principio 3.
- **Encaje:** un box tiene un router, no infraestructura de cadena. Check-in sigue funcionando y se sincroniza solo.
- **Alcance:** PWA con service worker y cola local de check-ins que se envía al volver la señal. Sin schema nuevo si el
  envío es idempotente (clave de cliente por check-in).
- **Esfuerzo:** 1–2 semanas. Riesgo principal: duplicados y estado de membresía desactualizado offline; mostrar el
  último estado conocido sin bloquear.

**Orden sugerido:** 13 (barata, dolor real del dueño), 14 y 15 cuando el onboarding o la conectividad sean un freno.
