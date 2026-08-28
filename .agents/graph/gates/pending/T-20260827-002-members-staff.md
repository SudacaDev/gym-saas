# Gate: T-20260827-002 — Skeleton + feedback de botones en `members-page`/`staff-page`/`member-detail-page`

- severity: medium (`edit_non_prod_file`, UI pura sin tocar base de datos — mismo criterio que T-20260826-004/005)
- approval_mode: async
- created: 2026-08-27

## Qué se hizo

Lote "members+staff" de un `#run` dividido en 4 lotes paralelos por carpetas disjuntas (`schedules-page`, `checkin-page`, `leads-page`+`operational-requests-page`+`kiosk-page`+`profile-page` corrían en paralelo en otras sesiones, no tocados acá). Alcance propio: `features/members-page/**`, `features/staff-page/**`, `features/member-detail-page/**`.

### Eje 1 — Skeleton estructural

- `features/members-page/components/members-table-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — reusa `Table`/`TableHeader`/`TableRow`/`TableHead`/`TableCell` reales y los 6 headers actuales de la tabla (Nombre/**Estado**/Código/Email/Teléfono/Acciones — la columna Estado fue agregada hoy por la sesión de critique/polish; el skeleton se armó leyendo el JSX actual, no una versión vieja), con 5 filas placeholder: barra de nombre, pill redondeada para Estado, código mono angosto, email, teléfono, y 3 barras en la columna de acciones (Ver/Editar/Dar de baja).
- `features/staff-page/components/staff-table-skeleton.tsx` (nuevo) + `.module.css` (nuevo) — mismo patrón para los 6 headers de Equipo (Nombre/Email/Categoría/Estado/Alta/Acciones), 5 filas, 3 barras de acción (no 4: el 4to botón "Fichar entrada/salida" es condicional a `staffCategory === "cleaning"`, dato que no existe todavía en loading, así que el skeleton muestra la forma del caso mayoritario).
- `features/members-page/index.tsx` y `features/staff-page/index.tsx` — la rama `loading` (antes `<p>Cargando...</p>`) ahora renderiza `<MembersTableSkeleton />` / `<StaffTableSkeleton />` respectivamente. El header, el input de búsqueda y los mensajes de error siguen renderizando siempre (no dependen de `loading`), sin cambios.
- `features/staff-page/components/staff-attendance-dialog.tsx` — el `<p>Cargando...</p>` del historial de fichajes dentro del diálogo se reemplazó por un `AttendanceHistorySkeleton` local (no ameritó archivo aparte por tamaño/alcance: solo se usa acá) que replica 3 `<li>` con la misma forma `.row` (fecha + horario) en `<Skeleton>`. 2 clases nuevas (`.skeletonDate`/`.skeletonTimes`) en `staff-attendance-dialog.module.css`.
- `features/member-detail-page/**` — **no tocado** en Eje 1: ya tenía skeleton propio de T-20260826-004 (`member-detail-skeleton.tsx`), confirmado sin ningún "Cargando..." nuevo pendiente (grep vacío).
- Ningún componente `Skeleton` nuevo — se reusó `components/ui/skeleton.tsx` (creado en T-20260826-004) en los 3 casos, sin recrearlo.

### Eje 2 — Feedback de pendiente en botones de acción

- **`ConfirmDialog` de "Dar de baja"** (socio y staff): revisado, **no requirió cambios** — la sesión de critique/polish de hoy ya lo dejó completo (`components/ui/confirm-dialog.tsx` maneja `confirming` internamente, deshabilita ambos botones y cambia el label a `confirmingLabel` ("Dando de baja...") mientras el `onConfirm` está en vuelo). Confirmado leyendo el componente, no se asumió.
- **`staff-page/index.tsx`** — el botón "Fichar entrada"/"Fichar salida" (categoría `cleaning`) ya tenía `disabled={togglingId === member.id}` pero el texto no cambiaba durante la request. Se agregó una tercera rama: mientras `togglingId === member.id`, el label pasa a "Fichando...".
- **`features/member-detail-page/index.tsx` + `hooks/useMemberDetail.ts`** (hallazgo propio, no listado explícitamente en la tarea original pero dentro de "cualquier otro botón de acción... que dispare una mutación sin feedback visible"): los 3 botones de cambio de estado de membresía (Reactivar/Pausar/Cancelar, sección "Membresías") disparaban un `PATCH /api/v1/memberships/:id` sin `disabled` ni cambio de texto — a diferencia de "Enviar recordatorio" en la misma página, que ya seguía el patrón `sendingReminder`/"Enviando...". Se agregó `statusChange: { membershipId, status } | null` al hook (mismo `try/finally` que ya usaba `handleSendReminder`), y en el componente los 3 botones de la fila afectada se deshabilitan juntos mientras hay un cambio en curso, con el botón presionado mostrando "Reactivando..."/"Pausando..."/"Cancelando...".
- Auditados sin cambios: "Ver" (navegación, no mutación), "Editar"/"Historial"/"Nueva membresía"/"Registrar pago" (abren diálogos con su propio `isSubmitting`, explícitamente fuera de alcance).

## Por qué requiere revisión

- Cambia el estado de carga y el feedback de botones de 3 pantallas reales del producto (Socios, Equipo, ficha de socio) — riesgo bajo (visual/UX puro, sin tocar datos, permisos ni contratos de API) pero visible en todo el flujo diario de front-desk.
- El hallazgo de `member-detail-page` amplía el alcance literal de la tarea (que solo mencionaba `staff-attendance-dialog.tsx` y el `ConfirmDialog` para Eje 2) — se decidió incluirlo porque encaja exactamente en el criterio "cualquier otro botón de acción... sin feedback visible" que la tarea sí autoriza, y porque dejar un botón de mutación real sin feedback en la misma pasada hubiera sido inconsistente con el resto del trabajo.
- Tercera vez que se aplica el patrón `Skeleton` reusable + `Table` real (después de T-20260826-004 `member-detail-page` y T-20260826-005 `plans-page`) — confirma que sigue siendo reusable entre features sin fricción ni casos borde nuevos.

## Verificación

- `npx tsc --noEmit` (repo completo): limpio.
- `npx eslint .` (repo completo): limpio.
- Detector de `impeccable` (`node .claude/skills/impeccable/scripts/detect.mjs features/members-page features/staff-page`): 0 findings, exit 0.
- `npm run test:unit`: **34/34 verde** (9/9 archivos) — sin las fallas ambientales de conexión a DB que documentaron T-20260826-005 y otras sesiones; no se repitieron esta vez.
- Sin verificación visual en navegador (mismo gap estructural documentado en sesiones anteriores — requiere sesión autenticada real).

## Gaps conocidos

- No se reindexó el grafo (`knowledge/`) tras los 6 archivos nuevos/tocados — queda para el próximo `--reindex`.
- El botón "Fichar entrada/salida" solo se usa para `staffCategory === "cleaning"` (ver comentario T-20260826-007 en el propio archivo) — el fix de Eje 2 ahí es de alcance chico a propósito, no se tocó el resto de esa lógica.
- No se auditaron a fondo los otros 3 lotes en paralelo (`schedules-page`, `checkin-page`, `leads-page`+`operational-requests-page`+`kiosk-page`+`profile-page`) — quedan fuera por diseño del split de carpetas disjuntas.

## Aprobación

- [ ] Aprobado por:
- [ ] Fecha:
- Sin comando post-aprobación pendiente — no hay migración ni cambio de datos reales en esta tarea.
