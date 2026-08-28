# Gate: T-20260827-002 — Skeletons estructurales + feedback de carga en botones (`leads-page` / `operational-requests-page` / `kiosk-page` / `profile-page`)

- severity: medium (`edit_non_prod_file`, UI pura sin tocar base de datos ni RLS — mismo criterio que T-20260826-004/005)
- approval_mode: async
- created: 2026-08-27

## Qué se hizo

Parte de un `#run` dividido en 4 lotes paralelos sobre carpetas disjuntas. Este lote cubrió `features/leads-page/**`, `features/operational-requests-page/**`, `features/kiosk-page/**` y `features/profile-page/**` — no se tocó `schedules-page`, `checkin-page`, `members-page` ni `staff-page` (lotes de otros agentes en paralelo).

### Eje 1 — Skeleton estructural (reemplaza "Cargando..." plano)

Mismo patrón que `member-detail-skeleton.tsx`/`plan-card-skeleton.tsx` (T-20260826-004/005): reusa `Table`/`TableHeader`/`TableRow`/`TableHead`/`TableCell` reales y las cabeceras/labels estáticos, reemplazando solo lo que depende de datos por `<Skeleton>` (`components/ui/skeleton.tsx`, no se recreó).

- `features/leads-page/components/leads-table-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — tabla con las mismas 6 columnas (Nombre/WhatsApp/Nota/Fecha/Estado/Acciones), 5 filas placeholder, celda Acciones con 2 barras simulando los botones Convertido/Perdido. El header y el `Input` de búsqueda (agregados hoy por la sesión de critique/polish) ya se renderizaban fuera del condicional `loading` — no se tocaron.
- `features/operational-requests-page/components/operational-requests-table-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — mismo patrón, columnas Descripción/Categoría/Reportado por/Fecha/Estado/Acciones, 1 barra en Acciones (acá solo hay un botón de toggle por fila, no dos).
- `features/kiosk-page/components/sell-grid-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — grilla de 6 tiles (no tabla, la vista real de "Vender" es de tiles grandes nombre+precio+CTA). Reusa `pageStyles.sellGrid` para el layout pero **no** reusa las clases interactivas de `pageStyles.sellTile` (hover/focus/active) porque estos son `<div>` no-interactivos, no botones reales.
- `features/kiosk-page/components/catalog-table-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — decisión de alcance propia, no pedida literalmente: el panel "Catálogo" (owner-only, agregado hoy por la sesión de critique/polish al separar Vender/Catálogo) no mostraba ningún "Cargando..." propio — ambos bloques reales estaban gateados solo con `!loading`, así que mientras cargaba el panel quedaba con el título "Catálogo" sobre un área vacía, indistinguible de "no hay productos". Se agregó un tercer bloque `{loading && <CatalogTableSkeleton />}` con columnas Nombre/Precio/Acciones y 2 placeholders cuadrados del tamaño real de los botones `icon-xs` (los mismos que la sesión previa cambió de texto a solo-ícono `PencilIcon`/`Trash2Icon`).
- `features/profile-page/components/profile-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — reemplaza el early-return `if (loading) return <p>Cargando...</p>`. Cubre las secciones Datos/Email/Contraseña (siempre presentes) con label real + barra skeleton en el input + barra skeleton en el botón. **Decisión de alcance:** la sección "Clases" (solo instructor) y los campos de certificaciones dentro de "Datos" (también solo instructor) **no** están en el skeleton — en este punto `profile.staffCategory` todavía no se cargó, así que no hay forma de saber si mostrarlos sin adivinar; se dejó comentado en el JSDoc del componente, mismo razonamiento que usa `member-detail-skeleton.tsx` para datos que no puede predecir.
- `features/profile-page/index.module.css` — se eliminó `.loadingText`, sin uso desde el reemplazo (mismo housekeeping que T-20260826-004 hizo con su propio `.loadingText`).

### Eje 2 — Feedback de carga en botones de acción

- `features/leads-page/hooks/useLeads.ts` — ya existía `updatingId` (deshabilita ambos botones de la fila) pero sin cambio de texto. Se agregó `pendingStatus: Lead["status"] | null` para saber **cuál** de los dos botones (Convertido/Perdido) fue el que disparó el PATCH, y en `index.tsx` cada botón muestra "Actualizando..." solo si es el que está en vuelo — mismo patrón gerundio que `checkin-page`'s `pendingId`/"Registrando...".
- `features/operational-requests-page/index.tsx` — un solo botón de toggle por fila, ya tenía `disabled={updatingId === request.id}`; se agregó el texto "Actualizando..." mientras está en vuelo (antes quedaba deshabilitado pero con el mismo texto "Marcar resuelto"/"Reabrir", sin señal de que algo estaba pasando).
- `features/kiosk-page/hooks/useKiosk.ts` — `handleProductDelete` no trackeaba estado pendiente. Se agregó `deletingId`, seteado antes del `DELETE` y limpiado en `finally`. En `index.tsx`, el botón de Borrar (ahora ícono-only `Trash2Icon`, sin texto — cambio hecho en la sesión que despachó esta tarea) reemplaza el ícono por `Loader2Icon` con `animate-spin` mientras `deletingId === product.id`, y queda `disabled` durante ese lapso — no hay texto que cambiar porque el botón nunca tuvo texto.
- `features/profile-page` — auditado: `ProfileBusinessForm`/`ProfileEmailForm`/`ProfilePasswordForm` ya usan `isSubmitting` de `react-hook-form` con cambio de texto ("Guardando...", "Enviando...", "Guardando...") en sus botones de submit. Sin gaps, no se tocó nada acá.

## Por qué requiere revisión

- Cambia el estado de carga/feedback de 4 pantallas reales del producto — riesgo bajo (visual puro, sin tocar datos, RLS ni contratos de API) pero visible para owner/staff en el uso diario.
- Se coordinó con el trabajo de otra sesión que corrió horas antes (critique/polish sobre estas mismas 3 carpetas + el cambio a botones ícono-only en Catálogo hecho en la sesión que despachó esta tarea): se releyó el estado actual de cada archivo con `Read` antes de tocar nada, no se asumió el contenido descripto en tareas viejas de `tasks.md`. Esto obligó a dos ajustes de alcance no anticipados en el enunciado original:
  1. El botón de Borrar en Catálogo ya no tiene texto (es icon-only) — el feedback de carga tuvo que ser un ícono de spinner reemplazando `Trash2Icon`, no un cambio de texto como en los otros ejes.
  2. El panel "Catálogo" (inexistente cuando se escribió la idea original de la tarea, producto del split Vender/Catálogo de la sesión de critique) no tenía ningún "Cargando..." propio para reemplazar — se detectó que quedaba con un vacío sin señal durante la carga y se agregó un skeleton ahí también, extendiendo el Eje 1 más allá de los 4 archivos con "Cargando..." literal que traía el enunciado.

## Verificación

- `npx tsc --noEmit`: limpio.
- `npx eslint .` (repo completo): limpio.
- Detector mecánico de `impeccable` (`detect.mjs`) sobre las 4 carpetas del lote: limpio, exit 0, sin hallazgos.
- `npm run test:unit`: **34/34 verde** (9/9 archivos) — sin fallas ambientales de conexión a DB esta vez (a diferencia de T-20260826-005, que sí las tuvo).

## Gaps conocidos

- Sin verificación visual en navegador (mismo gap estructural documentado en sesiones anteriores) — no se confirmó que los 5 skeletons nuevos se vean bien en la práctica, solo que compilan/lintean/testean limpio y replican la estructura del JSX real.
- `profile-skeleton.tsx` no cubre la sección "Clases" ni los campos de certificaciones (instructor-only) por no conocerse `staffCategory` todavía en el momento del loading — señalado arriba, no bloqueante.
- No se reindexó el grafo (`knowledge/`) tras los 10 archivos nuevos.
- No se auditó `dashboard-page`, `schedules-page`, `checkin-page`, `staff-page` ni `members-page` en este lote (algunos ya tienen skeleton de sesiones previas, otros no) — fuera del alcance de este `#run`, cubiertos (o no) por los otros 3 agentes en paralelo.

## Aprobación

- [ ] Aprobado por:
- [ ] Fecha:
- Sin comando post-aprobación pendiente — no hay migración ni cambio de datos reales en esta tarea.
