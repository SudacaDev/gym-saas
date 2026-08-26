# Tasks

> Estilo SDD (spec-driven development). Vive junto a `progress.md` pero con
> foco distinto: `progress.md` es "qué pasó", `tasks.md` es "qué falta y en qué orden".
>
> Si el usuario escribe `#task` en su prompt, la nueva tarea debe agregarse
> aquí para quedar registrada en el backlog versionado.
> Cada tarea completada debe dejar rastro en `graph/sessions/progress.md` y/o
> en `graph/history/`, no alcanza con tildarla solo aquí.

## Instalación del patrón (marcar al hacer graph-ia)
- [x] Modo detectado: brownfield
- [x] Árbol de carpetas creado
- [x] (brownfield only) Indexación inicial completa — bloqueante, ningún agente opera antes de esto
- [x] (brownfield only) Reconciliación de historial vía git log completada, commits marcados `origen: pre-graph`
- [ ] circuit-breaker.yml revisado y ajustado a este proyecto (los defaults son conservadores)
- [ ] policy.yml revisado — ¿las severidades por defecto tienen sentido para este proyecto?
- [ ] roles/registry.yml — ¿qué roles se activan en este proyecto? (no todos son obligatorios)




## Backlog del proyecto
### Tareas pendientes
- [ ] Sección de necesidades operativas para administrativo (insumos, mantenimiento)
    - id: T-20260826-010
    - type: schema+feature
    - contexto: plan "Equipo", 2026-08-26. Administrativo reporta necesidades de la sucursal — ej. "faltan elementos de limpieza", "esta máquina necesita mantenimiento". El owner va a tener su propia versión, pero **explícitamente confirmado que queda para más adelante** — no incluirlo en esta tarea.
    - alcance mínimo razonable (a confirmar en el `#run`, no bloqueante): tabla nueva tipo `operational_requests` (tenant_id + RLS estándar, quién la reportó, descripción, categoría opcional insumos/mantenimiento, estado abierto/resuelto), formulario simple de carga + listado — sin flujo de aprobación ni notificaciones todavía, eso sería sobre-alcance sin que el usuario lo haya pedido.
    - severity_flag: `high` (schema+migración nueva, mismo criterio que toda tabla nueva en este proyecto)
    - depends_on: T-20260826-006 (completada)

- [ ] Cupos y reservas de clases grupales ("camadas"): aforo máximo, lista de espera, presente/ausente
    - id: T-20260826-011
    - type: schema+feature
    - contexto: plan "Equipo"/producto, 2026-08-26 (imagen de referencia de un SaaS de gimnasios: "Current Group Class" con lista de asistentes y waitlist). El usuario describe la dinámica real: clases grupales llenan cupo de golpe (ej. 30 personas a las 18:00); si llega alguien sin reserva y está lleno, hay que poder rechazarlo o bajar a un ausente para darle el lugar.
    - requiere, como mínimo: aforo máximo por `class_schedules` (o por ocurrencia — ver open_question), tabla de reservas/inscripciones por socio y clase, lista de espera cuando se llena, marcar presente/ausente, lógica de "bajar a un ausente y subir al que espera".
    - open_questions grandes, sin resolver — **esta es la tarea más grande y menos cerrada de todo el plan, no debería `#run`earse sin una vuelta de scoping propia** (recomendado convocar `uiux-designer`+`backend-developer` como se hizo con T-007/T-20260824-003):
      1. `class_schedules` es una recurrencia semanal sin fecha concreta (confirmado en T-20260821-004: "no hay modelo de startDate/endDate/exception"). ¿El cupo/lista de espera es por OCURRENCIA real (ej. "lunes 25/08 a las 18:00" específico) o por el slot recurrente en general? Si es por ocurrencia, esto probablemente fuerza a modelar ocurrencias reales de clase por primera vez — cambio de schema más grande de lo que parece a primera vista.
      2. ¿Quién reserva — el socio mismo (no tiene login, ver PRODUCT.md) o siempre staff en su nombre desde el mostrador?
      3. ¿"Bajar a un ausente" es automático (el sistema lo hace) o una acción manual de staff?
    - severity_flag: `high`
    - depends_on: T-20260826-006 (completada)

- [ ] Cobro rápido / mostrador (kiosco): venta de productos y pases diarios
    - id: T-20260826-012
    - type: schema+feature
    - contexto: plan "Equipo"/producto, 2026-08-26. Venta de productos de mostrador (agua, barras de proteína, remeras) y pases diarios para gente de paso, desde una pantalla rápida tipo punto de venta.
    - open_questions sin resolver:
      1. ¿Hace falta control de stock real (cantidad disponible por producto) desde esta primera vuelta, o alcanza con un catálogo de productos con precio fijo, sin inventario?
      2. Pase diario: ¿genera un registro de `payments`/`checkins` existente (una especie de membership de un solo día) o es un concepto nuevo separado?
    - severity_flag: `high` (schema+migración nueva — catálogo de productos, ventas)
    - depends_on: T-20260826-006 (completada)

- [ ] Captura de leads (prospectos que preguntan en el mostrador)
    - id: T-20260826-013
    - type: schema+feature
    - contexto: plan "Equipo"/producto, 2026-08-26. Alguien entra a preguntar, se le cargan nombre + WhatsApp, se le explica el plan, se le regala una clase de prueba.
    - alcance mínimo razonable (a confirmar en el `#run`): tabla `leads` (tenant_id + RLS, nombre, whatsapp, fecha, nota opcional, estado tipo "nuevo"/"convertido"/"perdido"), formulario simple de carga + listado. Sin automatizaciones de seguimiento (WhatsApp/email) en esta primera vuelta — eso ya está anotado aparte en el backlog de producto grande (recordatorios/automatizaciones).
    - severity_flag: `high` (schema+migración nueva)
    - depends_on: T-20260826-006 (completada)

- [ ] Permisos por `department` dentro de administrativo (recepción vs. gerencia)
    - id: T-20260826-014
    - type: feature
    - contexto: plan "Equipo", 2026-08-26. El usuario detalló permisos específicos de recepción: SÍ puede cobrar cuotas, vender productos, dar de alta socio, marcar presente/ausente, abrir caja, ver deudores. NO puede crear planes, cambiar precios, borrar pagos históricos, ver facturación mensual, ni liquidar sueldos.
    - **cambio de modelo, no solo una tarea de UI:** hoy `staff_members.department` (recepción/ventas/contabilidad/gerencia) es metadata puramente descriptiva — no controla nada (confirmado explícitamente en el análisis de `backend-developer` para T-20260821-007: "no repetir esto acá, es un cambio de arquitectura real que amerita su propia discusión"). Esta tarea es exactamente esa discusión que se dijo que iba a llegar en algún momento.
    - open_question grande: la lista de "SÍ/NO puede" del usuario está pensada específicamente para recepción — falta definir qué puede ver/hacer ventas, contabilidad y gerencia. No asumir, no está en lo que el usuario dictó.
    - recomendado: convocar `backend-developer` (modelo de permisos, cómo extender `requireRole`/`lib/auth/require-role.ts` de "por rol" a "por rol+department" sin romper todos los call sites existentes) antes de `#run`.
    - severity_flag: `high` (cambio de modelo de autorización, toca todos los endpoints existentes potencialmente)
    - depends_on: T-20260826-006 (completada), recomendado resolver después de T-20260826-012 (cobro rápido) ya que gran parte de esta lista de permisos es sobre esa pantalla

- [ ] Rediseño de la pantalla de Check-in inspirado en la referencia (feed en vivo + clase actual con lista de espera + punto de venta rápido), con el sistema de diseño propio de BoxFlow
    - id: T-20260826-015
    - type: ui
    - contexto: usuario compartió una captura de un SaaS de gimnasios (layout de 3 columnas: feed de check-ins en vivo, clase actual con lista de asistentes/waitlist, punto de venta rápido) pidiendo adaptar ese orden/estructura manteniendo la identidad visual propia de BoxFlow (Volt, dark, pill — ver `DESIGN.md`), no copiar el estilo de la referencia.
    - **depende funcionalmente de que existan las piezas que ese layout muestra** — no tiene sentido construir esta pantalla antes que los datos que va a mostrar:
      - la columna de "clase actual con lista de espera" necesita T-20260826-011 (cupos/reservas).
      - la columna de "punto de venta rápido" necesita T-20260826-012 (cobro rápido/mostrador).
    - severity_flag: sin definir todavía (UI, pero depende de dos tareas de schema grandes — no evaluable en aislado)
    - depends_on: T-20260826-011, T-20260826-012 (ninguna de las dos completada todavía — esta tarea queda bloqueada hasta entonces)

### Tareas en curso

### Tareas completadas (referenciar en `progress.md`)
- [x] Perfil propio del staff, editable por categoría
    - id: T-20260826-009
    - type: feature
    - contexto: plan "Equipo", 2026-08-26. Pantalla nueva "Mi perfil" — staff no tenía ninguna vista propia. Campos editables según categoría: administrativo (email, password, teléfono); profesores (+ título/certificación, clases); limpieza (sin perfil propio, coherente con T-20260826-007).
    - decisión ya confirmada antes de este `#run`: "clases" en el perfil de profesores tiene el mismo alcance que `ScheduleFormDialog` hoy (owner+staff, sin distinción de categoría) — resuelto sin construir un segundo editor: la sección "Clases" del perfil solo linkea a `/schedules`, donde ese acceso ya existe tal cual.
    - path: `lib/staff/resolve-own-staff-member.ts` (extendido con el shape completo — antes solo devolvía `id`/`staffCategory`), `lib/validations/staff-profile.schema.ts` (nuevo), `app/api/v1/staff/me/route.ts` (nuevo, GET+PATCH), `app/(owner)/profile/page.tsx` (nuevo, guard server-side), `features/profile-page/**` (nuevo — `index.tsx`, `hooks/useProfile.ts`, `components/profile-{business,password,email}-form.tsx` + `.module.css`), `app/(owner)/presence-widget.tsx` (`PresenceUser` gana `category`), `app/(owner)/layout.tsx` (resuelve la categoría propia para staff), `app/(owner)/owner-nav.tsx` (`NAV_LINKS` pasa de `ownerOnly: boolean` a `visible(user)`, agrega "Mi perfil").
    - description: `GET`/`PATCH /api/v1/staff/me` — self-service, nunca toma un id, siempre "quién soy yo" (mismo patrón que T-007/T-008, reusa `resolveOwnStaffMember`). PATCH acepta `phone` para todos y `certifications`/`certificationExpiresAt` solo si `staffCategory === "instructor"` (ignorado en silencio para el resto). Email y password **no pasan por esta API** — van directo del cliente a `supabase.auth.updateUser()` (misma razón que login/logout: es una operación sobre la sesión propia, no necesita el admin client). Password se aplica al toque; email dispara el flujo de confirmación estándar de Supabase (ver gap abajo). El guard de `/profile` redirige a `/dashboard` si el rol no es `staff` o si la categoría es `cleaning`, igual que `layout.tsx` redirige a `/` por rol. Nav: "Mi perfil" visible solo para `staff` no-`cleaning`.
    - **Gap señalado explícitamente en el código y acá, no resuelto por decisión propia (no inventar infraestructura que no se pidió):** el cambio de email de Supabase no aplica al instante — manda un link de confirmación a la dirección nueva. Este proyecto no tiene ninguna ruta `/auth/callback`, así que aunque Supabase sí termina aplicando el cambio en `auth.users` una vez confirmado, la columna espejo local `users.email` (que hoy solo se escribe una vez, al crear la cuenta) **no se re-sincroniza sola** — queda desactualizada hasta que algo la vuelva a leer/escribir. Documentado en el propio componente, no se construyó un webhook/callback nuevo para esto sin que el usuario lo haya pedido.
    - `tsc --noEmit`: limpio. `eslint .` (repo completo, por el alcance de archivos tocados en nav/layout): limpio. Detector de `impeccable` sobre `features/profile-page` y `app/(owner)`: limpio. `test:unit`: **34/34 verde**.
    - gate: `graph/gates/pending/T-20260826-009.md` — `medium`/async (`severity_flag` de la propia tarea).
    - **Gap conocido adicional:** sin verificación funcional end-to-end (cargar el perfil, guardar teléfono, cambiar password, intentar cambiar email) con una cuenta staff real — no hay sesión de prueba disponible.
    - depends_on: T-20260826-006 (completada)

### Tareas completadas (referenciar en `progress.md`)
- [x] Alta de staff: administrativo puede dar de alta a profesores y limpieza (antes era owner-only)
    - id: T-20260826-008
    - type: feature
    - contexto: plan "Equipo", 2026-08-26. Extiende `POST /api/v1/staff` (antes `requireRole(["owner"])`) para que `staff` con `staffCategory: "administrative"` también pueda crear cuentas.
    - decisión confirmada con el usuario (2026-08-26): **sí, administrativo puede dar de alta a cualquier categoría, incluido otro administrativo** — el gate es tener la categoría "administrativo" en sí, no una lista acotada de categorías que puede crear.
    - **aprobación síncrona explícita antes de tocar código** (severity_flag `high` de la propia tarea — mismo nivel que T-20260821-007/T-20260825-002, crea cuentas reales de Supabase Auth): confirmado por el usuario vía `AskUserQuestion` ("Sí, correla"), 2026-08-26.
    - nota de alcance: no confundir con permisos por `department` dentro de administrativo (recepción/ventas/contabilidad/gerencia) — ese es un eje distinto, ver T-20260826-014.
    - path: `lib/staff/resolve-own-staff-member.ts` (nuevo — compartido con T-20260826-007), `app/api/v1/staff/route.ts`, `app/api/v1/staff/me/attendance/route.ts` (refactor para usar el helper nuevo, sin cambio de comportamiento ahí).
    - description: `requireRole()` no puede expresar "staff, pero solo esta categoría" — solo conoce `role`, no `staffCategory` — así que el chequeo de categoría es un segundo gate explícito en el `POST`: `requireRole(["owner","staff"])` y, si el caller es `staff`, `resolveOwnStaffMember(context)` debe devolver `staffCategory === "administrative"` o tira `ForbiddenError`. Se extrajo `resolveOwnStaffMember` (antes vivía inline y duplicada en `staff/me/attendance/route.ts`, T-007) a un helper compartido en `lib/staff/` — mismo resultado, sin duplicar la query de "quién soy yo como staff".
    - **Gap señalado explícitamente en el código (comentario) y acá, no resuelto por decisión propia de no expandir alcance:** esto solo amplía el endpoint de creación. `GET /api/v1/staff` (el roster) y el link de nav "Equipo" siguen siendo owner-only (T-20260825-001) — un administrativo puede llamar este `POST` directo, pero hoy no tiene ningún punto de entrada en la UI para llegar a él (no ve el botón "Invitar"). No se tocó porque es exactamente el tipo de permiso "rol+categoría" que T-20260826-014 reserva para su propia discusión — abrir la visibilidad acá hubiera sido asumir esa decisión sin que el usuario la haya tomado todavía.
    - `tsc --noEmit`, `eslint` (los 3 archivos tocados): limpios. `test:unit`: **34/34 verde**.
    - gate: `graph/gates/pending/T-20260826-008.md` — `high`/**síncrono, aprobado por SudacaDev** (`AskUserQuestion`, 2026-08-26).
    - depends_on: T-20260826-006 (completada)

### Tareas completadas (referenciar en `progress.md`)
- [x] Login/logout = fichaje automático para staff (entrada al loguearse, salida al cerrar sesión)
    - id: T-20260826-007
    - type: feature
    - contexto: plan "Equipo" dictado por el usuario a mano, 2026-08-26. Reemplaza el modelo de fichaje manual (T-20260825-005) por uno automático para todo staff que se loguea normalmente: iniciar sesión genera la entrada en `staff_attendance`, cerrar sesión genera la salida. Limpieza queda excluida (tiene cuenta real pero no se loguea a fichar la suya propia — administrativo/owner la manejan a mano, el botón manual sigue siendo suyo).
    - decisiones ya resueltas antes de este `#run` (ver mensaje del usuario en la sesión): limpieza con cuenta real sin auto-fichaje; botón manual se acota a `staffCategory === "cleaning"`; sesión cortada sin logout explícito queda fichada como presente sin timeout automático (mismo criterio que `checkins.checkedOutAt`).
    - path: `app/api/v1/staff/me/attendance/route.ts` (nuevo), `features/sign-in-page/components/sign-in-form.tsx`, `app/(owner)/presence-widget.tsx`, `features/staff-page/index.tsx`.
    - description: Nuevo endpoint self-service `POST`/`PATCH /api/v1/staff/me/attendance` — a diferencia de `staff/[id]/attendance/**`, nunca toma un `staffMemberId` del caller: siempre resuelve "quién soy yo" desde la sesión (`users.authUserId` → `staffMembers.userId`), así que un staff solo puede ficharse a sí mismo, nunca a otro. Ambos handlers son best-effort e idempotentes — no-op silencioso (`{skipped:true}`, 200) si el rol no es `staff`, si no hay `staffMembers` row, si ya hay una entrada abierta (POST) o si no hay nada abierto para cerrar (PATCH). `sign-in-form.tsx` dispara el `POST` fire-and-forget después de un login exitoso (no bloquea la navegación ni el UX de login si falla). `presence-widget.tsx` hace `await` del `PATCH` **antes** de `supabase.auth.signOut()` — tiene que correr mientras la cookie de sesión todavía es válida, si no `getTenantContext()` no tendría con qué resolver quién está saliendo. `staff-page/index.tsx`: el botón manual "Fichar entrada/salida" ahora solo se renderiza para `staffCategory === "cleaning"`.
    - `tsc --noEmit`, `eslint` (los 4 archivos tocados) y el detector de `impeccable` sobre `features/staff-page`: limpios. `test:unit`: **34/34 verde**.
    - gate: `graph/gates/pending/T-20260826-007.md` — `medium`/async (mismo `severity_flag` que la propia tarea traía).
    - **Gap conocido:** sin verificación funcional end-to-end con una cuenta staff real (login → fichaje → logout → fichaje cerrado) — no hay sesión de prueba disponible en esta sesión. El diseño idempotente/best-effort busca que, si algo falla, falle silencioso y no bloquee login/logout, pero eso mismo significa que un fallo real (ej. un bug en la query de resolución) podría pasar desapercibido hasta que alguien note que su fichaje nunca se abrió — vale la pena confirmarlo en vivo.
    - depends_on: T-20260826-006 (completada)

### Tareas completadas (referenciar en `progress.md`)
- [x] Permitir que `staff` acceda a `/dashboard` (y al resto del grupo de rutas `(owner)` que le corresponda) — `app/(owner)/layout.tsx` lo bloqueaba y lo mandaba al index
    - id: T-20260826-006
    - type: bugfix
    - contexto: usuario reportó que el botón "Ir al dashboard" de la home (`features/home-page/index.tsx`) lo mandaba de vuelta al index en vez de dejarlo entrar. Diagnóstico: `HomePage` solo chequea `supabase.auth.getUser()` (sin mirar rol) para mostrar el CTA; `middleware.ts` lo deja pasar a `/dashboard` (tiene `tenant_id`/`role` en `app_metadata`); pero `app/(owner)/layout.tsx` hacía `requireRole(context, ["owner"])` — cualquier rol que no fuera `owner` tiraba `ForbiddenError`, atrapado por el layout con `redirect("/")`.
    - **Investigación previa a aplicar el fix (resolvió la open_question de la propia tarea):** se leyó el comentario original de `layout.tsx` ("out of scope for this phase; /dashboard below is owner-only") — decisión deliberada en su momento, no un descuido. Pero quedó desactualizada por trabajo posterior: se verificó con `Grep` (no `reducto`, búsqueda de string literal exacto en varios archivos — caso fuera de lo que Reducto resuelve bien) que `members`, `checkins`, `checkins/self` y el GET de `plans` ya son `requireRole(["owner","staff"])` a nivel API; el POST de `plans` es la única excepción owner-only explícita ("pricing is the owner's call, not front desk's"), y `GET /api/v1/staff` es owner-only desde T-20260825-001 (roster de personal). `owner-nav.tsx` ya filtra el link "Equipo" como `ownerOnly: true` y deja el resto (`Dashboard`/`Socios`/`Planes`/`Horarios`/`Check-in`) en `ownerOnly: false` — la UI ya asumía este acceso, solo el guard del layout no se había actualizado.
    - path: `app/(owner)/layout.tsx`.
    - description: `requireRole(context, ["owner"])` → `requireRole(context, ["owner", "staff"])`. Docstring reescrito: ya no dice "owner-only area", explica que las distinciones owner-vs-staff (pricing de planes, roster de staff) se aplican por operación en cada API route, no en este guard — este solo decide quién pasa la puerta de entrada. `member` (o cualquier otro rol) sigue redirigido a `/`, sin cambios ahí.
    - `tsc --noEmit`, `eslint "app/(owner)/layout.tsx"`: limpios. `test:unit`: **34/34 verde** (el `TypeError` de conexión a la base de la tarea anterior no se repitió).
    - gate: `graph/gates/pending/T-20260826-006.md` — `medium`/async (`edit_non_prod_file` — cambio de código reversible, sin tocar datos ni cuentas reales; las restricciones finas por operación ya existían a nivel API y quedan intactas).
    - **Gap conocido:** sin verificación visual/funcional con una cuenta `staff` real en navegador (mismo gap estructural de siempre — no hay sesión autenticada disponible). El razonamiento se apoya en lectura de código (nav ya filtra, APIs ya aceptan `staff`), no en probarlo en vivo.
    - depends_on: ninguna

### Tareas en curso

### Tareas completadas (referenciar en `progress.md`)
- [x] Skeleton en la página de Planes (`plans-page`) para reemplazar el texto "Cargando..." — misma estructura que la grilla de cards con datos, pero con placeholders skeleton
    - id: T-20260826-005
    - type: ui
    - contexto: mismo pedido que T-20260826-004 pero para `plans-page`. A diferencia de `member-detail-page` (early-return completo), acá `loading` era un condicional inline: el header (`Planes` + botón "Nuevo plan") ya se renderizaba siempre, real e interactivo, sin depender de `plans` — solo el área de la grilla cambiaba entre "Cargando...", vacío o la grilla de cards real.
    - path: `features/plans-page/components/plan-card-skeleton.tsx` (nuevo) + `.module.css` (nuevo), `features/plans-page/index.tsx` (rama `loading` del condicional).
    - description: `PlanCardSkeleton` reusa `pageStyles.card` (la clase real de la card, ya con el radio cappeado `min(var(--radius-xl),20px)` documentado contra el bug óvalo de T-20260825-010 — no se reinventó el contenedor) y reemplaza por `<Skeleton>` los 4 elementos que dependen de datos: `periodTag` (pill), `cardName`, `cardPrice` y los 2 botones de `cardActions`. `index.tsx` renderiza 3 `PlanCardSkeleton` dentro del mismo `styles.grid` que usa la vista real, en vez de `<p>Cargando...</p>`. No hizo falta crear el primitivo `Skeleton` de nuevo — ya existía desde T-20260826-004.
    - `tsc --noEmit`, `eslint features/plans-page` y el detector de `impeccable`: los 3 limpios. `test:unit`: 23/34 verdes — **5 archivos de integración fallaron por un error de conexión a la base** (`checkin-checkout`, `checkin-requires-active-membership`, `dashboard-metrics`, `member-soft-delete`, `payment-extends-membership`), ninguno relacionado a `plans-page` ni a ningún archivo tocado por esta tarea — mismo patrón ambiental de fallas de DB documentado repetidamente en sesiones anteriores (antes como `PostgresError 53300`, esta vez como `TypeError` en el cleanup por tenant no creado), no investigado de nuevo.
    - `reducto context` post-tarea: 83% de tokens ahorrados en la sesión.
    - gate: `graph/gates/pending/T-20260826-005.md` — `medium`/async (`edit_non_prod_file`, UI pura).
    - **Gap conocido:** sin verificación visual en navegador (mismo gap estructural de siempre).
    - depends_on: ninguna

### Tareas en curso

### Tareas completadas (referenciar en `progress.md`)
- [x] Skeleton en la página de ficha de socio (`member-detail-page`) para reemplazar el texto "Cargando..." — misma estructura que la vista con datos, pero con placeholders skeleton
    - id: T-20260826-004
    - type: ui
    - contexto: hoy el estado `loading` de `useMemberDetail()` retornaba solo `<p>Cargando...</p>` (`styles.loadingText`). El usuario pidió que en su lugar se replique el layout real de la página (header/hero de socio, tablas de membresías/pagos/check-ins/recordatorios) pero con cada dato en versión skeleton.
    - open_question resuelta durante `#run`: no había componente `Skeleton` genérico en `components/ui/` — se creó uno (decisión propia, no bloqueante: es el primitivo estándar shadcn, bajo riesgo, mismo patrón `cn()`/`className` que `Button`/`Input`).
    - path: `components/ui/skeleton.tsx` (nuevo), `features/member-detail-page/components/member-detail-skeleton.tsx` (nuevo) + `.module.css` (nuevo), `features/member-detail-page/index.tsx` (usa `MemberDetailSkeleton` en el early-return de `loading`), `features/member-detail-page/index.module.css` (`.loadingText` eliminada, ya sin uso).
    - description: `MemberDetailSkeleton` reutiliza los componentes reales (`Table`/`TableHeader`/`TableRow`/`TableHead`/`TableCell`, labels/títulos de sección estáticos como "Membresías"/"Pagos"/"Check-ins"/"Recordatorios", mismas columnas) y solo reemplaza por `<Skeleton>` lo que depende de datos aún no cargados: nombre del socio, los 6 valores de la lista `dl` (Código/Email/Teléfono/Nacimiento/DNI/Certificado médico — las dos filas condicionales quedan afuera, su existencia misma depende de datos), los botones de acción de cada sección (dependen de props que todavía no existen: `memberId`/`plans`/`currentMembership`) y 3 filas placeholder por tabla. El link "← Volver a socios" queda real e interactivo (no depende de datos). Reusar `Table` en vez de un `<div>` a mano evita a propósito el bug de radio-pill-en-container-ancho que documentó T-20260825-010 (`Table` ya cappea su radio via `min(var(--radius-md),12px)`).
    - `tsc --noEmit`, `eslint features/member-detail-page components/ui/skeleton.tsx` y el detector mecánico de `impeccable` (paso obligatorio del skill tras UI): los 3 limpios, sin advisories. `test:unit`: **34/34 verde**.
    - `reducto context` tras el `#run`: 83% de tokens ahorrados en la sesión (confirma que T-20260826-003 funciona — `reducto query "<path>" --resolve --view skeleton` acepta un path de archivo directamente como query, sin necesitar filtro nativo; cierra ese gap que había quedado abierto en el gate de T-003).
    - gate: `graph/gates/pending/T-20260826-004.md` — `medium`/async (`edit_non_prod_file`, UI pura, sin tocar base de datos — mismo criterio que T-20260825-010).
    - **Gap conocido:** sin verificación visual en navegador (requiere sesión real autenticada, mismo gap estructural de sesiones anteriores).
    - depends_on: ninguna

### Tareas completadas (referenciar en `progress.md`)
- [x] Reducto: resolver solo el subgrafo relevante de la tarea en curso durante `#run`, no el grafo entero
    - id: T-20260826-003
    - type: process
    - contexto: `reducto context` mostraba `Tokens saved: 0` pese a 5 queries — 2473/2473 nodos seguían `Unknown`, 0 `Known`/`Partial`. Causa: las queries corridas no usaban `--resolve`, así que nunca se cacheó contenido real y no había línea base contra la cual medir ahorro (ver `progress.md` de esta sesión para el diagnóstico completo). El usuario pidió que, al trabajar una tarea del backlog, se resuelva puntualmente solo esa porción del grafo — no una exploración a ciegas.
    - path: `AGENTS.md` (paso 8, `#run`).
    - description: Agregada una frase al final del paso 8 de `AGENTS.md`: antes de tocar código en cada tarea ejecutada vía `#run`/`#run-all`, correr `reducto query --resolve --view skeleton` scopeado — usando la metadata `path:` de la tarea si ya existe (más preciso que texto libre), o las keywords del título si la tarea es nueva y todavía no tiene `path:` resuelto. Explícitamente no se resuelve el grafo entero ni por curiosidad fuera del alcance de la tarea. No se renumeraron los pasos existentes (9/10/11 se mantienen intactos) porque `progress.md`/`tasks.md` ya referencian "`AGENTS.md` #11" en gates previos — renumerar hubiera roto esas referencias.
    - gate: `graph/gates/pending/T-20260826-003.md` — `medium`/async.
    - depends_on: ninguna

### Tareas completadas (referenciar en `progress.md`)
- [x] Convención de hooks de feature: `hooks/use<Nombre>.ts` (camelCase) — migrar `schedules-page` y extraer hooks nuevos en `staff-page`, `checkin-page`, `members-page`, `member-detail-page`
    - id: T-20260826-002
    - type: refactor
    - contexto: usuario dejó `features/plans-page/hooks/usePlans.ts` como ejemplo explícito del patrón deseado (hook cliente con estado/fetch/handlers, ubicado en `hooks/`, nombrado `useXxx.ts` camelCase) y pidió aplicarlo al resto del proyecto. Conflicto detectado con lo existente: `features/schedules-page/use-schedules.ts` vivía en la raíz del feature con naming kebab-case (`use-schedules.ts`), no en `hooks/`.
    - decisión confirmada con el usuario (`AskUserQuestion`, 2026-08-26): **migrar todo el proyecto ahora** — no solo documentar la convención.
    - path: `features/schedules-page/hooks/useSchedules.ts` (movido desde la raíz), `features/staff-page/hooks/useStaff.ts` (nuevo), `features/checkin-page/hooks/useCheckin.ts` (nuevo), `features/members-page/hooks/useMembers.ts` (nuevo), `features/member-detail-page/hooks/useMemberDetail.ts` (nuevo) + los 5 `index.tsx` correspondientes.
    - description: Ejecutado vía 5 subagentes `frontend-developer` en paralelo (archivos disjuntos entre sí, sin colisión). Cada `index.tsx` quedó solo con JSX + la llamada al hook; mismo estado/API calls/condiciones/handlers que antes, sin cambio de comportamiento. `member-detail-page` quedó como hook único (no partido) por decisión propia documentada en el gate — `currentMembership` es dependencia compartida entre el efecto de pagos y el envío de recordatorio, partir hubiera exigido prop-drilling o duplicar el memo. Verificación de reglas de hooks vía skill `react-architecture` (paso obligatorio de `AGENTS.md` #11): sin violaciones — discrepancia no bloqueante entre la convención kebab-case que documenta el skill y el camelCase que el usuario confirmó explícitamente, señalada en el gate. `tsc`/`eslint` (repo completo) limpios; `test:unit` **34/34 verde**.
    - gate: `graph/gates/pending/T-20260826-002.md` — `medium`/async.
    - depends_on: ninguna

### Tareas completadas (referenciar en `progress.md`)
- [x] Convención de ubicación para helpers no-hook extraídos de un feature (`format.ts`/`calendar.ts`/`sparkline.ts` de `dashboard-page`)
    - id: T-20260826-001
    - type: refactor
    - decisión confirmada con el usuario (`AskUserQuestion`, 2026-08-26): agrupar en subcarpeta `lib/` dentro de cada feature (no dejarlos sueltos en la raíz).
    - path: `features/dashboard-page/lib/{format,calendar,sparkline}.ts` (movidos vía `git mv` desde la raíz del feature), `features/dashboard-page/index.tsx` (3 imports actualizados). Consistencia de convención: `features/schedules-page/day-labels.ts` → `features/schedules-page/lib/day-labels.ts`, con sus 3 importadores (`schedule-table-view.tsx`, `schedule-kanban-view.tsx`, `schedule-form-dialog.tsx`) actualizados.
    - description: Pura reorganización de archivos — cero cambio de contenido salvo las líneas de import movidas. Fija la convención de proyecto para helpers puros no-hook feature-scoped (categoría que el skill `react-architecture` no cubre explícitamente, distinta de `hooks/`). `tsc`/`eslint` limpios; `test:unit` 23/34 verde, 11 fallas por `PostgresError 53300` (pool de conexiones, ambiental, sin relación a los archivos tocados — mismo patrón documentado en sesiones anteriores).
    - gate: `graph/gates/pending/T-20260826-001.md` — `medium`/async.
    - depends_on: ninguna

### Tareas descartadas (con motivo — no ejecutar, se conservan por trazabilidad)
- [ ] ~~Horarios (vista Tabla): botón "+ Agregar franja horaria" para crear una fila nueva a demanda~~ — **superseded por T-20260825-009**
    - id: T-20260825-008
    - type: ui
    - motivo del reemplazo: el usuario contraargumentó con el patrón de Google Calendar (grilla siempre visible, sin un click extra para "crear" la fila) y el equipo, al repensarlo en serio, cambió de recomendación — ver T-20260825-009 (completada) para el diseño vigente. Queda acá solo como historial de la discusión (primera recomendación del equipo, luego revisada), no como tarea a ejecutar.
    - contexto original (primera pasada del equipo, ya no vigente): convocados `uiux-designer` + `backend-developer` en paralelo, recomendaron un botón "+ Agregar franja horaria" que agregaba una fila en estado local hasta guardar la primera clase ahí, y rechazaron tanto un rango fijo universal como un campo `opening_time`/`closing_time` configurable en `tenants` (esa parte del análisis de backend — no repetir el patrón de `short_code` que backfillea, acá sería inventarle al dueño un dato de negocio falso — sigue siendo válida si el tema de horario configurable se revisita en el futuro).
    - depends_on: T-20260825-007 (completada)

### Tareas completadas (referenciar en `progress.md`)
- [x] Horarios (vista Tabla): rango de filas derivado de los propios horarios del owner (min–max + relleno horario)
    - id: T-20260825-009
    - type: ui
    - supersede a T-20260825-008 (no corrida, queda como historial de la discusión).
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): paso de 1 hora fija; rango único para toda la semana (no por columna/día) — se toma el mínimo/máximo de TODOS los horarios cargados y esa misma banda se repite en las 7 columnas.
    - path: `features/schedules-page/components/schedule-table-view.tsx`.
    - description: `timeRows` pasó de "solo los `startTime` exactos en uso" a un rango sintético entre el `startTime` mínimo y el `endTime` máximo de todos los horarios cargados, en pasos de 1 hora. **Límite superior — regla elegida:** se excluye la hora en que termina la última clase si termina justo en punto (ej. última clase 08:00–09:00 → sin fila 09:00 colgando vacía), pero se incluye si termina a mitad de hora (ej. 08:00–09:30 → sí aparece la fila 09:00, porque una clase real la ocupa parcialmente). **Decisión no pedida explícitamente pero necesaria:** el matching de celda pasó de igualdad exacta de `startTime` a "bucket por hora" — tomar el enunciado al pie de la letra (misma lógica de celda, solo iterando sobre filas sintéticas) hubiera hecho que cualquier horario que no arranca justo en punto (el input de hora no tiene `step`, "18:30" es válido) desapareciera silenciosamente de la grilla. `index.tsx` sigue gateando las 3 vistas detrás de `schedules.length === 0`, sin tocar — confirmado que `ScheduleTableView` nunca renderiza con 0 horarios. `tsc`/`eslint`/`test:unit` (34/34) limpios.
    - gate: `graph/gates/pending/T-20260825-009.md` — `low/medium`/async.
    - commit: `7d18c07`
    - depends_on: T-20260825-007 (completada)
- [x] Rediseño de acento/forma: naranja → Volt (verde lima) + radio pill en todo el sistema
    - id: T-20260825-010
    - type: ui
    - contexto: usuario compartió capturas de bigg.fit (app de gimnasio, marca Under Armour) pidiendo llevar parte de esa identidad visual a BoxFlow. Decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): alcance = color + botones pill (no todo el rediseño consumer de BIGG); Volt puro `#CCFF00`; radio pill en todo el sistema (no solo botones); Signal Green ("Activo") comparte el mismo verde que el acento, riesgo de confusión aceptado a sabiendas.
    - path: `app/globals.css`, `DESIGN.md`.
    - description: `--radius: 0.375rem` → `9999px` en `:root`/`.dark` (cascada automática a toda la escala `rounded-*` vía el `calc()` ya existente). `--primary`/`--sidebar-primary`/`--ring`/`--sidebar-ring`/`--chart-1` → `#ccff00`; `--primary-hover`/`--chart-2` → `#b8e600` (Volt oscurecido, no hay margen para aclarar más); `--status-success-fg`/`--chart-3` → `#ccff00`, `--status-success-bg` → `#1f2400`. `DESIGN.md` reescrito: paleta, todas las menciones a "Ignition Orange" → "Volt", nota explícita de la decisión consciente Signal Green = Volt. `tsc`/`eslint` limpios; sin stragglers de naranja hardcodeado fuera de `globals.css` (grep confirmado).
    - **Bug encontrado post-implementación (usuario, con captura real de `/checkin`):** el radio pill plano no solo afectó botones/inputs — cualquier contenedor multi-fila/multi-celda que clippea su contenido (`overflow-hidden`/`overflow-x-auto`) también se volvió una píldora gigante, y la curva (capada por el navegador a la mitad de la altura del bloque, no de una fila) le comía el padding a las filas de arriba/abajo — texto literalmente cortado ("ndres Garcia" en vez de "Andres Garcia") en la lista de socios de Check-in.
    - **Revisión visual antes de corregir (a pedido explícito del usuario, "creá un diseño visual antes de hacer esos cambios así los apruebo"):** artifact publicado reproduciendo el bug real (mismos datos: Andres Garcia/Alberto Medina/Jose Machado) lado a lado con la propuesta de arreglo, más un segundo caso encontrado proactivamente (los diálogos de formulario tienen el mismo bug, no estaba en la captura del usuario). Usuario aprobó ("si esta bien la propuesta").
    - **Arreglo aplicado (aprobado):** radio de dos niveles, no uno solo — controles (botón/input/badge/chip) siguen pill vía `--radius` plano; contenedores multi-fila que clippean pasan a `rounded-[min(var(--radius-xl),20px)]` (`min(var(--radius-md),12px)` para `table.tsx`) — mismo patrón `min()` que `button.tsx` ya usaba para sus tamaños chicos (`xs`/`sm`/`icon-xs`/`icon-sm`), no un mecanismo nuevo. 5 archivos: `features/checkin-page/index.module.css` (`.list`, `.insidePanel`), `components/ui/table.tsx` (wrapper), `components/ui/dialog.tsx` (`DialogContent`, `DialogFooter`), `features/schedules-page/components/schedule-calendar-view.module.css` (`.grid`), `features/home-page/index.module.css` (`.browserFrame`, `.benefitsGrid`). `DESIGN.md` sección "Shapes" y "Cards / Containers" reescritas para documentar la regla de dos niveles (evita que se repita el mismo bug la próxima vez que se agregue un contenedor). `tsc`/`eslint` limpios tras el arreglo.
    - **Segunda ronda de correcciones (usuario siguió navegando en su propia sesión y encontró más):** el primer arreglo (5 archivos) solo cubrió los casos con `overflow-hidden`/`overflow-x-auto` explícito que el grep original detectó. El usuario mandó dos capturas más:
      - `Horarios` (vista Tabla): la grilla completa era un óvalo (`.weekWrap` usa `overflow-x-auto rounded-xl`, mismo patrón que `table.tsx` — se había buscado solo `overflow-hidden`, no `overflow-x-auto`, así que se escapó del primer barrido) — corregido. El usuario avisó de forma proactiva "el kanban también está mal": mismo patrón en `schedule-kanban-view.module.css` (`.board`) — corregido antes de que mandara la captura.
      - `Planes`: las cards de cada plan eran óvalos — **causa distinta**, no tenían `overflow-hidden` en absoluto, simplemente `rounded-xl` sin capar en un contenedor ancho-y-no-tan-alto (`plans-page/index.module.css` `.card`). Esto reveló que el problema real no era "contenedores que clippean" sino, más en general, "cualquier card/contenedor sin capar" — se hizo una auditoría completa de `rounded-(xl|lg|md|2xl|3xl|4xl)` en todo el proyecto (14 archivos con matches) en vez de seguir corrigiendo uno por uno a medida que el usuario los encontraba.
      - De esa auditoría, 5 casos más confirmados como contenedores (no controles) y corregidos con el mismo patrón `min()`: `checkin-page/index.module.css` `.resultBanner` (banner de resultado), `dashboard-page/index.module.css` `.onboarding` (estado vacío), `schedules-page/index.module.css` `.slot` (card de clase — visible ovalada en la captura del usuario) y `.cellEmpty` (bloque "+" vacío — también ovalado en la misma captura), `select.tsx` (desplegable de `<Select>`, capado a 12px como `table.tsx` por ser lista de opciones compactas).
      - Casos revisados y dejados en pill a propósito (controles genuinos, altura chica, sin contenido que la curva pueda pisar): links del sidebar, botones CTA de la home, textarea de notas de salud, campos `h-9` de staff, fila de fichaje, chip de día en horarios, chip de clase en el calendario. Se documenta acá por si alguno termina viéndose mal en uso real — no descartado de forma permanente, solo no corregido sin evidencia.
      - `tsc`/`eslint` limpios tras ambas rondas.
    - **Gap conocido:** sin verificación visual propia en navegador en ningún momento — la sesión de Claude no tiene la sesión autenticada del usuario (redirige a `/sign-in`), y no se usaron credenciales. Ambas rondas de corrección se basaron en capturas que mandó el usuario, no en inspección propia.
    - severity_flag: `medium` (mismo criterio que T-20260824-001, UI pura, no toca base de datos)
    - depends_on: ninguna
- [x] Fichaje de staff: registrar horario de entrada/salida (clock-in/clock-out)
    - id: T-20260825-005
    - type: schema+feature
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): lo carga el owner/otro staff por él (sin autoservicio); fila abierta que se cierra (`clockIn`+`clockOut` nullable, mismo patrón que `checkins.checkedOutAt`); listado básico de historial en esta primera vuelta.
    - path: `db/schema/staff-attendance.ts` (nuevo), `db/policies/0007_staff_attendance_rls.sql`, `db/migrations/0013_old_paladin.sql`, `lib/validations/staff-attendance.schema.ts` (nuevo), `app/api/v1/staff/[id]/attendance/route.ts` (nuevo — GET historial + POST fichar entrada), `app/api/v1/staff/[id]/attendance/[attendanceId]/route.ts` (nuevo — PATCH fichar salida), `app/api/v1/staff/route.ts` (+`openAttendanceId`), `features/staff-page/index.tsx` + `types.ts`, `features/staff-page/components/staff-attendance-dialog.tsx` (nuevo) + `.module.css`.
    - description: Tabla `staff_attendance` — FK a `staffMembers.id` (no a `users.id`, es dato de RR.HH./turno específico del rol staff), RLS `tenant_isolation` estándar. **Decisión de alcance (no pedida explícitamente, documentada en el gate):** no existe pantalla de detalle por staff (a diferencia de socios) — el historial vive en un diálogo por fila en la tabla de "Equipo", no se construyó una página nueva. **Permisos: owner+staff, no owner-only** — se mantiene así a pesar de que T-20260825-001 restringió el roster (`GET /api/v1/staff`) a owner-only, porque la propia decisión #1 de esta tarea dice explícitamente "el owner **o otro staff**" ficha — restringir a owner-only hubiera contradicho eso. Gap señalado: hoy en la práctica solo el owner llega a esta UI, porque `(owner)/layout.tsx` ya redirige a staff fuera de todo el route group (mismo gap heredado que T-20260825-001 documentó). `GET /api/v1/staff` gana `openAttendanceId` (subquery correlacionada) para que la UI sepa el estado fichado/no-fichado de cada fila sin un round-trip extra por fila. De paso, se corrigió un bug real: `StaffFormDialog` (edición) no devolvía `openAttendanceId`, así que "Editar" borraba ese estado en memoria — corregido preservándolo localmente. `tsc`/`eslint` limpios; `test:unit` 29-31/34 (fallas por `PostgresError` de pool de conexiones, ambiental, confirmado sin relación a los archivos tocados).
    - gate: `graph/gates/pending/T-20260825-005.md` — `medium`/async, aprobado por SudacaDev. `npm run db:migrate` corrido y **verificado contra la base real** (2026-08-26): tabla `staff_attendance` y policy `tenant_isolation` presentes.
    - commit: `25ebac7`
    - depends_on: T-20260825-002 (completada)
- [x] Horarios (vista Tabla): click en un bloque vacío de la grilla día×hora abre el diálogo de "Nuevo horario" con día/hora ya cargados
    - id: T-20260825-007
    - type: ui
    - contexto: usuario compartió una captura de la vista Tabla mostrando celdas vacías entre las que sí tienen horario cargado, pidiendo que sean clickeables (ícono "+" + fondo tenue ocupando todo el bloque) y abran el diálogo de creación con día/hora ya cargados.
    - alcance: solo la vista Tabla — Kanban/Calendario quedan afuera (estructuras de datos distintas, sin celdas vacías día×hora equivalentes).
    - path: `features/schedules-page/components/schedule-table-view.tsx`, `components/schedule-form-dialog.tsx`, `index.module.css`.
    - description: `ScheduleFormDialog` gana `initialValues` opcional (día/inicio/fin), usado por `defaultsFor()` solo en modo creación — mismo formulario y `onSubmit` de siempre, sin lógica duplicada. La celda vacía renderiza un botón que ocupa todo el bloque (`PlusIcon` centrado, `bg-secondary/30` — familia Soot de `DESIGN.md`, no un color nuevo, intensifica en hover) envuelto en el mismo diálogo, sin `schedule`, con `initialValues` de esa fila/columna. `endTime` se precarga como `startTime` + 1 hora (`addOneHour`, función pura local) porque no hay modelo de duración fija por fila — decisión propia, campo queda editable. `tsc`/`eslint`/`test:unit` (34/34) limpios.
    - gate: `graph/gates/pending/T-20260825-007.md` — `medium`/async, sin bloquear.
    - **Gap conocido:** sin verificación visual en navegador (requiere sesión real autenticada).
    - depends_on: ninguna
- [x] Horarios: 3 vistas — tabla / kanban / calendario
    - id: T-20260825-006
    - type: ui
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): "3 variables" = typo por "vistas"; la grilla semanal existente se reusa como vista "tabla" (no se reemplaza); kanban con columnas por día de la semana; calendario como grilla mensual tipo Google Calendar (cada clase recurrente aparece en cada día del mes que matchea su `dayOfWeek`, sin modelo de excepciones por ocurrencia — fuera de alcance, el schema no tiene `startDate`/`endDate`). Default = "tabla" (decisión propia, no regresiva).
    - path: `features/schedules-page/index.tsx` (reescrito), `index.module.css` (+ estilos de switcher), `use-schedules.ts` (nuevo — hook compartido de fetch/CRUD), `components/schedule-view-props.ts` (nuevo), `components/schedule-table-view.tsx` (nuevo — grilla existente extraída tal cual), `components/schedule-kanban-view.tsx` + `.module.css` (nuevo), `components/schedule-calendar-view.tsx` + `.module.css` (nuevo).
    - description: Switcher de 3 tabs (subrayado 2px de acento, distinto del patrón borde-izquierdo+fondo del sidebar — `DESIGN.md` liga ese patrón específicamente al sidebar). Las 3 vistas comparten una única instancia del hook de datos (`use-schedules.ts`), sin fetch duplicado. Kanban y calendario abren el mismo `ScheduleFormDialog` para editar (paridad con la tabla); el botón "Nuevo horario" queda visible fuera del switch, en las 3 vistas. `tsc`/`eslint` limpios, `test:unit` 34/34 verde.
    - gate: `graph/gates/pending/T-20260825-006.md` — `low/medium`/async.
    - commit: `502949e`
    - depends_on: T-20260821-004 (completada)
- [x] Header de sesión: presencia en tiempo real + botón de salir, nav "Equipo" restringido a owner (datos y UI)
    - id: T-20260825-001
    - type: ui+feature
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): "quién está conectado" = presence tracking en tiempo real del equipo (no el widget simple de identidad+logout recomendado por defecto); "Equipo" se restringe también a nivel de datos (`GET /api/v1/staff` owner-only, no solo el link del nav); ingreso mensual del dashboard confirmado como recordatorio — ya estaba implementado desde T-20260821-006, sin cambios.
    - path: `app/(owner)/layout.tsx`, `app/(owner)/owner-nav.tsx`, `app/(owner)/presence-widget.tsx` (nuevo) + `.module.css`, `app/api/v1/staff/route.ts`.
    - description: Widget de presencia vía Supabase Realtime Presence (canal `presence:tenant:{tenantId}`, scoped por tenant), trackea `users.id` (fila local, no el id de Supabase Auth). Botón "Cerrar sesión" reutiliza `supabase.auth.signOut()` ya existente. Nav "Equipo" filtrado client-side (`ownerOnly` en `NAV_LINKS`, rol pasado como prop desde `layout.tsx` — no existía mecanismo previo para esto, se usó el más simple). `GET /api/v1/staff`: `requireRole(["owner","staff"])` → `requireRole(["owner"])`. Gap documentado: `app/(owner)/layout.tsx` ya redirige a staff/member fuera de todo el grupo `(owner)` desde antes, así que en la práctica el widget de presencia hoy solo puede mostrar al owner — el cambio de `GET` es hardening defensivo, no cierre de un hueco activo. `tsc`/`eslint` limpios.
    - gate: `graph/gates/pending/T-20260825-001.md` — `medium`/async, **aprobado por SudacaDev** (instrucción directa en el chat, 2026-08-25). Sin migración — nada más pendiente de ejecutar.
    - commit: `7ce6d9a`
    - depends_on: ninguna
- [x] Alta de staff: usuario+contraseña definidos por el owner (reemplaza invitación por email)
    - id: T-20260825-002
    - type: schema+feature
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): se reemplaza el flujo de invitación por email (a sabiendas del antipatrón de seguridad); `username` como campo separado del email; fichaje (entrada/salida) separado en tarea propia (T-20260825-005); 2FA solo como restricción de diseño, no implementado.
    - path: `db/schema/staff-members.ts` (+`username`), `db/migrations/0012_melted_lethal_legion.sql`, `lib/validations/staff-member.schema.ts`, `app/api/v1/staff/route.ts` + `[id]/route.ts`, `features/staff-page/components/staff-form-dialog.tsx`.
    - description: `POST /api/v1/staff` pasa de `admin.auth.admin.inviteUserByEmail` a `admin.auth.admin.createUser({email,password,email_confirm:true})`, mismo patrón de compensación (borra la cuenta Auth si falla el insert local). `username` nuevo en `staff_members`, unique `(tenant_id, username)`, display-only — el login sigue siendo email+password, no se construyó un segundo camino de login. Password mínimo 8 caracteres, reusa la regla ya existente en `lib/validations/auth.ts` (`signUpSchema`). Reset de password fuera de alcance de este pass (gap documentado); unicidad de `username` case-sensitive, sin `citext` (gap documentado). `tsc`/`eslint` limpios; `test:unit` 23/34 verdes, 11 fallas por `PostgresError 53300` (pool de conexiones saturado, ambiental — confirmado que ningún archivo que falla importa código tocado por esta tarea).
    - gate: `graph/gates/pending/T-20260825-002.md` — `high`/síncrono, **aprobado por SudacaDev** (`AskUserQuestion`, 2026-08-25). **Incidente durante la aplicación (resuelto):** entre la aprobación y la ejecución apareció 1 fila real en `staff_members` — la migración original (`ADD COLUMN username NOT NULL` sin backfill) fallaba silenciosamente contra esa fila; corregida con un backfill (mismo patrón que `short_code`/`checkin_code`) antes de aplicar. `npm run db:migrate` corrido y **verificado contra la base real** (2026-08-25): `username` `NOT NULL` presente, unique index presente, la fila existente backfillada sin error.
    - commit: `3fae426` (implementación) + `d571683` (fix del backfill de la migración)
    - depends_on: T-20260821-007 (completada — esta tarea la modifica)
- [x] Check-in: ID visual corto para socios (`short_code`)
    - id: T-20260825-003
    - type: feature+schema
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): campo distinto del código de auto-check-in (T-20260825-004), no se unifican; formato 2 letras+2 números+2 letras (ej. "AB12CD"), único.
    - path: `db/schema/members.ts` (+`shortCode`), `db/migrations/0010_known_mordo.sql`, `lib/members/generate-short-code.ts` (nuevo), `lib/api/handle-api-error.ts` (+`isUniqueViolation`), `app/api/v1/members/route.ts`, `features/checkin-page/`, `features/members-page/`, `features/member-detail-page/` (+`.module.css` cada uno), varios `tests/unit/*` y `tests/integration/tenant-isolation/rls-policies.test.ts` actualizados.
    - description: `shortCode` unique `(tenant_id, short_code)`, `NOT NULL` con backfill determinístico en la misma migración (mismo patrón que el backfill de `activity_id` en T-20260821-008). Generado server-side al crear un socio, con reintento en colisión (hasta 5 intentos, 503 si se agotan — matemáticamente casi inalcanzable, ~45.7M combinaciones/tenant). Mostrado como label secundario (mono) junto al nombre en check-in, lista de socios y ficha de socio — no en el form de alta, porque es generado, no un campo que carga el owner/staff. `tsc`/`eslint` limpios.
    - gate: `graph/gates/pending/T-20260825-003.md` — `medium`/async (subido de `low` por el backfill de filas reales), aprobado por SudacaDev. `npm run db:migrate` corrido y **verificado contra la base real** (2026-08-25): `short_code` `NOT NULL` presente.
    - commit: `77064f4`
    - depends_on: ninguna
- [x] Check-in manual por código de 6 dígitos (auto-check-in, `checkin_code`)
    - id: T-20260825-004
    - type: schema+feature
    - decisiones confirmadas con el usuario (`AskUserQuestion`, 2026-08-25): campo distinto del `short_code` de T-20260825-003; flujo completo de punta a punta (UI + endpoint, no solo el campo); código de 6 dígitos único por tenant; rate limiting requerido.
    - path: `db/schema/members.ts` (+`checkinCode`), `db/schema/enums.ts` (+`"self_code"` en `checkinMethodEnum`), `db/migrations/0011_tiresome_scarlet_spider.sql`, `lib/members/generate-checkin-code.ts` (nuevo), `lib/rate-limit/fixed-window-limiter.ts` (nuevo), `lib/validations/checkin.schema.ts` (+`checkinSelfSchema`), `app/api/v1/checkins/self/route.ts` (nuevo), `app/api/v1/members/route.ts`, `features/checkin-page/`.
    - description: `checkinCode` unique `(tenant_id, checkin_code)`, `NOT NULL` con backfill (mismo patrón que `short_code`). **Decisión de alcance no pedida explícitamente, documentada como supuesto:** el endpoint de auto-check-in NO es público/sin-login — vive dentro de la sesión ya autenticada de owner/staff en el mostrador (mismo `requireRole(["owner","staff"])` que el resto de `/checkins`), con un modo de entrada numérica como alternativa a buscar por nombre. Si la intención real era un kiosco público sin sesión, esto no lo cubre — señalado para revisión. Rate limiting: limitador propio en memoria (fixed-window, 5 intentos fallidos/min por `tenantId:userId`), 429 al superarlo; caveat documentado: no sobrevive cold start ni se comparte entre instancias (deploy Vercel serverless estándar, confirmado contra `vercel.json`). `tsc`/`eslint` limpios.
    - gate: `graph/gates/pending/T-20260825-004.md` — `medium`/async, aprobado por SudacaDev. `npm run db:migrate` corrido y **verificado contra la base real** (2026-08-25): `checkin_code` `NOT NULL` presente, `checkin_method` incluye `self_code`.
    - commit: `62a1aa1`
    - depends_on: ninguna
- [x] Alta de staff: flujo real de creación de cuenta + formulario especializado por categoría (profesores / administrativos / limpieza)
    - id: T-20260821-007
    - type: schema+feature
    - decisión confirmada con el usuario (`AskUserQuestion`, 2026-08-24): el set de campos definido el 22/08 por `uiux-designer`+`backend-developer` queda tal cual, sin cambios.
    - path: `db/schema/enums.ts` (+`staffCategoryEnum`/`staffDepartmentEnum`/`staffShiftEnum`), `db/schema/staff-members.ts` (nuevo), `relations.ts`/`index.ts`, `db/policies/0006_staff_members_rls.sql`, `db/migrations/0009_cheerful_emma_frost.sql`, `lib/validations/staff-member.schema.ts`, `app/api/v1/staff/route.ts` + `[id]/route.ts`.
    - description: Tabla `staff_members` — soft delete vía `deletedAt` (consistente con `members.ts`, no el boolean `active` sugerido originalmente). `POST /api/v1/staff` (owner-only) crea la cuenta real vía `admin.auth.admin.inviteUserByEmail` (la persona fija su propia contraseña) + inserta `users`+`staff_members` en una transacción; si la transacción falla, borra la cuenta de Auth recién creada para no dejarla huérfana. `PATCH`/`DELETE` (owner-only, soft delete) en `[id]/route.ts`. `tsc`/`eslint`/`test:unit` (34/34) limpios.
    - `npm run db:migrate` corrido y verificado contra la base real (2026-08-25): `staff_members` con 17 columnas, tipos/nullability correctos, RLS forzada, policy `tenant_isolation` presente. Sin incidentes esta vez.
    - **Gaps conocidos:** sin extender `tests/integration/tenant-isolation/rls-policies.test.ts` para `staff_members` (mismo gap que en `email_send_log` de T-003); el soft delete no revoca el acceso real de Supabase Auth, solo oculta el registro de RR.HH.; ninguna cuenta real fue creada — eso ocurre recién cuando un owner complete el formulario en producción, y depende de que el envío de invitación de Supabase Auth esté configurado (no verificado en esta sesión).
    - severity_flag: `high` (crea cuentas reales de Supabase Auth) — gate síncrono `graph/gates/pending/T-20260821-007.md`, aprobado por SudacaDev (`AskUserQuestion`, 2026-08-25).
    - depends_on: ninguna
- [x] Pantalla "Equipo/Staff": tabla de personas (nombre, email, rol/estado, fecha alta) + búsqueda + botón Invitar
    - id: T-20260824-002
    - type: ui
    - decisión confirmada con el usuario (`AskUserQuestion`, 2026-08-24): "Schema primero" — se construyó ya el schema real de `staff_members` (T-20260821-007) en vez de datos mock, así que esta pantalla queda conectada a datos reales desde el arranque.
    - path: `features/staff-page/` (`index.tsx`, `index.module.css`, `types.ts`, `components/staff-form-dialog.tsx` + `.module.css`), `app/(owner)/staff/page.tsx`, link "Equipo" en `owner-nav.tsx` (ícono `IdCardIcon`).
    - description: Tabla con buscador cliente por nombre/email, `StatusPill` "Activo" (todas las filas listadas ya están activas — el filtro `deletedAt IS NULL` vive en el GET), `StaffFormDialog` para invitar/editar con campos condicionales por categoría (chips de especialidad reusando el patrón de `schedule-form-dialog.tsx`, `Select` de área/turno). En edición el email se muestra como texto estático, no editable (es la identidad de la cuenta). "Última conexión" de la referencia de Linear quedó afuera — vive en `auth.users.last_sign_in_at`, no modelado en Drizzle, traerla por fila requeriría N llamadas a la Admin API por request.
    - depends_on: T-20260821-007 (comparten migración, ver su gate)
    - Sin verificación visual en navegador (requiere sesión real de owner).

### Tareas completadas (referenciar en `progress.md`)
- [x] Integración con Gmail: recordatorios automáticos, envío de mails y (más adelante) agenda
    - id: T-20260824-003
    - type: schema+feature+integration
    - **Cambio de alcance durante la implementación (2026-08-24):** se descubrió que el proyecto ya tiene Resend integrado y funcionando (recibo de pago). Consultado con el usuario, se decidió reusar Resend en vez de construir OAuth de Gmail — elimina toda la parte de `email_integrations`/tokens del plan original. El título de la tarea queda desactualizado (sigue diciendo "Gmail") pero el contenido real es "recordatorios de vencimiento vía Resend"; no se renombra para no perder la trazabilidad con el pedido original del usuario.
    - decisión confirmada con el usuario (`AskUserQuestion`, 2026-08-24): recordatorio automático dispara 3 días antes del vencimiento (`REMINDER_DAYS_BEFORE`); agenda queda explícitamente fuera de esta tarea; el copy del mail lo escribe el equipo (hecho, tono cordial y operativo).
    - path: `db/schema/enums.ts` (+`emailSendTypeEnum`, `emailSendStatusEnum`), `db/schema/members.ts` (+`emailOptOut`), `db/schema/email-send-log.ts` (nuevo), `relations.ts`/`index.ts`, `db/policies/0005_email_send_log_rls.sql`, `db/migrations/0008_romantic_maginty.sql`, `lib/email/membership-reminder.ts`, `lib/reminders/reminder-window.ts`, `lib/reminders/send-and-log-reminder.ts`, `app/api/v1/memberships/[id]/send-reminder/route.ts`, `app/api/cron/membership-reminders/route.ts`, `app/api/v1/email-send-log/route.ts`, `vercel.json`, `.env.local.example`, `features/member-detail-page/index.tsx`, `features/members-page/components/member-form-dialog.tsx`, `app/api/v1/members/route.ts` + `[id]/route.ts`, `tests/unit/membership-reminder.test.ts`.
    - description: `emailOptOut` en `members` es el gate de compliance para el envío automático (el manual, disparado por owner/staff, no se ve afectado — es una decisión puntual, no el barrido masivo que el opt-out existe para proteger). `email_send_log` audita cada intento (automático o manual) y su unique `(membership_id, reminder_scheduled_for)` evita que el cron mande el mismo recordatorio dos veces. El cron (`app/api/cron/membership-reminders`) recorre todos los tenants vía `getDb()` (rol elevado, solo para listar tenants) y hace cada lectura/escritura real de datos de negocio a través de `withTenantContext` por tenant — RLS nunca se bypasea para datos de negocio. UI: botón "Enviar recordatorio" + tabla de historial en la ficha del socio (owner y staff, según el modelo de permisos acordado), checkbox de opt-out en el form de socio.
    - `npm run db:migrate` corrido y verificado contra la base real (2026-08-24): `email_send_log` con 11 columnas, RLS forzada, policy `tenant_isolation` presente, ambos índices (PK + unique de idempotencia) presentes; `members.email_opt_out` boolean NOT NULL default false. `npm run test:unit`: **34/34 verde** (incluye los 8 que fallaban antes de migrar por la columna inexistente, sin haber sido tocados). `tsc`/`eslint` limpios.
    - **Gaps conocidos, no resueltos en este pass:** no se extendió `tests/integration/tenant-isolation/rls-policies.test.ts` para sembrar `email_send_log` (a diferencia de lo que sí se hizo para `activities`/`class_schedules` en T-003/T-008) — solo hay unit tests puros para la lógica de ventana/template. Sin verificación visual en navegador del botón/tabla nuevos en la ficha de socio (requiere sesión real). El cron no manda ningún mail real todavía: falta configurar `CRON_SECRET` en el deploy de Vercel y, si no está ya, verificar un dominio propio en Resend (mismo requisito que ya tenía el recibo de pago).
    - severity_flag: `high` — gate síncrono `graph/gates/pending/T-20260824-003.md`, aprobado por SudacaDev ("si apruebo", 2026-08-24) y ejecutado.
    - depends_on: ninguna
- [x] Catálogo de actividades (para no escribir el nombre a mano en Horarios)
    - id: T-20260821-008
    - type: schema+feature
    - decisiones tomadas con el usuario (`AskUserQuestion`, 2026-08-21): gestión vía quick-add en el diálogo de horario (no página propia); `class_schedules.activity_id` pasa a ser FK real a `activities.id` (no solo autocompletar de texto libre). Borrado de actividad en uso: mismo patrón `ON DELETE RESTRICT` + 409 que ya usa `plans` → `memberships` — decisión propia, no requirió pregunta nueva.
    - **Pass A — hecho y aplicado a la base real (2026-08-22):** `db/schema/activities.ts` (tabla nueva, unique `(tenant_id, name)`), `db/schema/class-schedules.ts` (agrega `activity_id` nullable, FK `ON DELETE RESTRICT`, mantiene `activity_name` por ahora), `relations.ts`/`index.ts`, `db/policies/0004_activities_rls.sql`, `db/migrations/0006_quiet_bedlam.sql` (generado + backfill SQL agregado a mano). `npm run db:migrate` corrido y verificado contra la base real: 3 filas en `activities` ("Funcional", "Localizada", "PowerFit"), las 6 filas de `class_schedules` con `activity_id` asignado (0 sin asignar), RLS `tenant_isolation` presente y forzada. Test de aislamiento extendido. `tsc`/`eslint` limpios. Gate aprobado: `graph/gates/pending/T-20260821-008-pass-a.md` ("apruebo npm run db:migrate", SudacaDev, 2026-08-22).
    - **Pass B — hecho y aplicado a la base real (2026-08-24):** `db/schema/class-schedules.ts` (`activity_id` → `NOT NULL`, `activity_name` eliminada del schema), migración `db/migrations/0007_many_silver_surfer.sql`, `lib/validations/activity.schema.ts` (nuevo), `lib/validations/schedule.schema.ts` (`activityId` uuid en vez de `activityName` texto), `app/api/v1/activities/route.ts` (nuevo — GET list + POST get-or-create vía `onConflictDoUpdate`, sin endpoint de borrado en este alcance), `app/api/v1/schedules/route.ts` + `[id]/route.ts` (trabajan con `activityId`), `features/schedules-page/components/schedule-form-dialog.tsx` + `.module.css` (picker `Select` del catálogo + "+ Nueva actividad" inline reemplaza el `Input` de texto libre), `features/schedules-page/index.tsx` (carga catálogo + resuelve nombre a mostrar), `tests/integration/tenant-isolation/rls-policies.test.ts` (seed actualizado). `tsc`/`eslint`/`test:unit` (28/28) limpios.
    - **Incidente durante la migración (resuelto, ver `progress.md` para el detalle completo):** primer intento de `npm run db:migrate` falló por `PostgresError 53300` (pool de conexiones saturado) — no tocó la base, se reintentó. Segundo intento reveló el problema real: 4 filas de `class_schedules` ("indoor cycling", cargadas el 2026-08-22 vía la API vieja que solo guardaba `activity_name`) tenían `activity_id NULL`, algo que pass A no pudo prever porque esas filas se crearon después de su verificación. Reportado al usuario, aprobado (`AskUserQuestion`) un backfill puntual — misma lógica que el backfill de pass A pero acotado a esas 4 filas — antes de reintentar la migración.
    - **Resultado final, verificado contra la base real:** `class_schedules` tiene 8 columnas (`activity_name` ya no existe, `activity_id` es `NOT NULL`), las 10 filas reales (6 de pass A + 4 de "indoor cycling") tienen `activity_id` válido y joinean correctamente contra `activities`, RLS (`relrowsecurity`/`relforcerowsecurity`) en `true` para `class_schedules` y `activities`. `db/policies/**` reaplicado (idempotente, 4 archivos, sin cambios).
    - gate: `graph/gates/pending/T-20260821-008-pass-b.md` — aprobado por SudacaDev (`AskUserQuestion`, 2026-08-24), incluye el detalle completo del incidente y su resolución.
    - depends_on: ninguna

- [x] Reemplazar el nav horizontal por un sidebar fijo estilo app-shell de SaaS (icono + label por ítem, agrupado, sin tocar paleta/tipografía de BoxFlow)
    - id: T-20260824-001
    - type: ui
    - path: `app/(owner)/layout.tsx` + `.module.css`, `app/(owner)/owner-nav.tsx` + `.module.css`, `DESIGN.md` (sección "Navigation" actualizada al patrón nuevo)
    - contexto: usuario compartió 7 capturas de Linear pidiendo que gym-saas "se vea más a un SaaS, más profesional". Alcance acordado: arrancar solo por el sidebar (ítem 1 de 4 sugeridos) — selector de negocio/tenant, empty states con ilustración+CTA y configuración agrupada en cards quedan sugeridos, no pedidos.
    - description: `owner-nav.tsx` pasó de barra horizontal a `<aside>` vertical `sticky top-0 h-screen`, con brand arriba, un grupo "Gestión" y 5 links icono+label (`lucide-react`: `LayoutDashboardIcon`, `UsersIcon`, `CreditCardIcon`, `CalendarDaysIcon`, `ScanLineIcon`). Estado activo: borde izquierdo 2px Ignition Orange + fill `--accent` (antes el nav no tenía background en ningún estado; es la única excepción documentada ahora en `DESIGN.md`). Colapsa a rail icon-only (sin JS, solo CSS por breakpoint `md`) para no romper el check-in en mobile/tablet. `layout.tsx` pasó de columna (header+main) a fila (sidebar+main, `min-w-0` en `main`). Ninguna página bajo `app/(owner)/**` necesitó cambios (grep de `sticky`/`z-`/`position: fixed` sin conflictos). `tsc`/`eslint` limpios; sin verificación visual en navegador (requiere sesión real).
    - severity_flag: `medium` (`edit_non_prod_file`, confirmado contra `gates/policy.yml`)
    - gate: `graph/gates/pending/T-20260824-001.md` — async, autorizado por el flujo, sin bloquear.
    - depends_on: ninguna
- [x] Dashboard: ocultar "ingreso del mes" para el rol staff (solo owner lo ve)
    - id: T-20260821-006
    - type: feature
    - path: `features/dashboard-page/index.tsx`
    - description: El bloque de ingresos (label + valor + tendencia) ahora solo se renderiza si `context.role === "owner"` — el resto del hero (socios activos, vencimientos, check-ins) queda igual para staff, tal como se asumió por defecto. La segunda open_question (qué ve el staff en el lugar vacío) se resolvió no mostrando nada — sin placeholder, el statRow simplemente queda como único contenido del hero; decisión propia por simplicidad, no se volvió a preguntar. Cálculo de `revenueThisMonth`/`revenueTrendPct` en `metrics.ts` no se tocó (Server Component: el dato no renderizado nunca llega al cliente, no hace falta condicionar el cálculo). `tsc`/`eslint`/detector limpios (detector encontró 6 advisories de tamaños de fuente preexistentes en `dashboard-page/index.module.css`, no relacionados a este cambio — no tocados).
    - depends_on: ninguna
- [x] Horarios: en "Editar" mostrar los días como chips para tildar/destildar (igual que en "Nuevo horario")
    - id: T-20260821-009
    - type: feature
    - path: `features/schedules-page/components/schedule-form-dialog.tsx`, `features/schedules-page/index.tsx`
    - description: Unificado el picker de días — "Editar" ya no usa `Select` de un solo día, usa los mismos chips que "Nuevo horario", pre-tildando el día original de la fila. `onSubmit` diffea contra ese día original: si sigue tildado, `PATCH` la fila existente; si se destildó, `DELETE` directo (sin `confirm()` adicional, default confirmado por el usuario) vía el nuevo callback `onRemoved`; cualquier día nuevo tildado crea una fila nueva (`POST`) con el mismo horario/actividad del formulario (segundo default confirmado). `onRemoved` agregado a `ScheduleFormDialogProps` y wireado en `SchedulesPage` (`handleRemoved`, filtra la fila del estado local). Imports no usados (`Controller`, `Select*`, `DAY_LABELS`) limpiados. `tsc`/`eslint`/detector limpios.
    - depends_on: T-20260821-004 (completada)

### Tareas pendientes

### Tareas completadas (referenciar en `progress.md`)
- [x] Visual de horarios semanales (UI)
    - id: T-20260821-004
    - type: feature
    - path: `lib/validations/schedule.schema.ts`, `app/api/v1/schedules/route.ts` + `[id]/route.ts`, `features/schedules-page/` (`index.tsx`, `index.module.css`, `day-labels.ts`, `components/schedule-form-dialog.tsx` + `.module.css`), `app/(owner)/schedules/page.tsx`, link "Horarios" en `app/(owner)/owner-nav.tsx`.
    - description: Sección propia "Horarios" (decisión de marketing/UX registrada abajo) con grilla semanal de 7 columnas hairline-separadas (patrón `benefits`-grid de `DESIGN.md`), colapsa a 1-2 columnas en mobile. CRUD completo vía `ScheduleFormDialog` (día + hora inicio/fin + actividad), permisos `["owner","staff"]` en las 4 operaciones (GET/POST/PATCH/DELETE) tal como confirmó el usuario. `tsc --noEmit` y `eslint` limpios. Detector mecánico de `impeccable` corrido sobre `features/schedules-page` y `features/plans-page`: encontró un advisory (tamaño de fuente `10px` fuera de la escala tipográfica en `plans-page`, no relacionado a esta tarea pero corregido de paso a `11px`) — segunda corrida, limpio.
    - notes:
      - 2026-08-21: usuario delega la decisión "sección Horarios propia vs. panel en dashboard" al equipo de marketing — convocados `marketing-director` + `uiux-designer` en paralelo.
      - 2026-08-21: **decisión — sección propia "Horarios"**, no panel en dashboard. Ambos coinciden independientemente:
        - Marketing: el dashboard es el activo de posicionamiento ("un vistazo, una respuesta" vs. software de cadenas); una grilla semanal es el objeto más denso del producto y competiría con el hero. Horarios además es un objeto de armado esporádico (no de consulta diaria), con dos roles editando — pide pantalla propia, no un panel de solo-lectura. Único guiño aceptable en el dashboard: una línea "clases de hoy" como dato secundario, a probar, no de regalo (el dashboard ya tiene 3 slots secundarios ocupados).
        - UX: el patrón "Data Panel" del dashboard es una lista 1D (header + hairline + filas); una grilla día×hora×actividad×instructor×cupo es una matriz 2D con edición real — forzarla en filas hairline da una tabla ilegible en mobile (dispositivo primario) o exige un componente nuevo de todos modos, mejor que viva en su propia sección. Point abierto y barato de validar más adelante: si el dueño termina consultando el horario a diario (no solo armándolo), agregar un stat liviano tipo "Próxima clase: 18:00 CrossFit" al hero — nunca la grilla completa.
        - Marketing marca línea roja de scope para v1: horario **declarativo** (día/hora/actividad) nada más — cupos, reservas, lista de espera, instructores y recurrencias quedan afuera hasta que sean una decisión de producto explícita, no un arrastre de esta tarea.
      - **Corte del circuit breaker (dos veces) durante esta tarea** — ver detalle completo en `progress.md`. No se bypaseó en ningún caso; se esperó revisión explícita del usuario ("podes seguir") las dos veces antes de continuar.
    - depends_on: T-20260821-003 (completada)
- [x] Socios: agregar fecha de cumpleaños, DNI y datos legales/de salud (certificado médico, notas de salud)
    - id: T-20260821-005
    - type: schema+feature
    - path: `db/schema/members.ts` (4 columnas nuevas), `lib/validations/member.schema.ts` (validación DNI 7-8 dígitos), `app/api/v1/members/route.ts` + `[id]/route.ts`, `features/members-page/components/member-form-dialog.tsx` (+`.module.css`), `features/member-detail-page/index.tsx`, `db/migrations/0005_modern_nick_fury.sql`.
    - description: Columnas `birth_date` (date, nullable), `dni` (text, nullable, validado 7-8 dígitos), `medical_certificate_submitted` (boolean NOT NULL DEFAULT false), `health_notes` (text, nullable) — decisión del usuario: columnas directas en `members` (no tabla separada), mismo acceso para owner y staff (sin restricción adicional sobre el dato de salud). Certificado médico se muestra como `StatusPill` success/alert en la ficha del socio. `tsc`/`eslint`/detector de `impeccable` limpios. Migración generada, gate `high` aprobado por SudacaDev, `npm run db:migrate` corrido y verificado contra la base real (4 columnas confirmadas con tipos/nullability correctos).
    - gate: `graph/gates/pending/T-20260821-005.md` — aprobado 2026-08-21, no movido a `gates/approved/` por el mismo invariante que T-20260821-003.
    - depends_on: ninguna
- [x] Migrar clases Tailwind inline (className) a archivos CSS colocados por componente, bajo `app/**`
    - id: T-20260821-001
    - type: refactor
    - path: app/**
    - description: Extraídas las clases utilitarias de className a un `*.module.css` en la misma carpeta de cada componente (19 archivos bajo `app/**`), usando `@apply` + `@reference` a globals.css. Incluye también los mapas de clases dinámicas (STATUS_CLASSES/PAYMENT_STATUS_CLASSES en checkin y members/[memberId]), que ahora referencian clases del CSS module en vez de strings Tailwind crudos. Alcance acordado con el usuario: `components/ui/*` (primitivos shadcn con cva) quedan afuera a propósito — no se tocan. Grafo reindexado post-migración: 122 nodos / 67 edges / 7 comunidades.
- [x] Sección de planes: reemplazar la tabla por una grilla de cards
    - id: T-20260821-002
    - type: ui
    - path: features/plans-page/index.tsx, features/plans-page/index.module.css
    - description: `PlansPage` pasó de `<Table>` a una grilla de cards (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`) — cada card muestra periodicidad (chip con borde, sin badge de status para no pisar el patrón de status semántico), nombre (Title role), precio grande con sufijo `/período` y las acciones Editar/Borrar en un footer con hairline. Dentro del lenguaje visual de `DESIGN.md` (sin sombras, bordes hairline, sin ícono inventado porque `Plan` no tiene ese campo). `tsc --noEmit` limpio; sin verificación visual en navegador (requiere sesión real contra el Supabase del proyecto, no local).
    - process_note: **Ejecutada fuera de proceso la primera vez** (sin `#run` ni gate `medium`). El usuario pidió revertirla y re-correrla bien; se revirtió a la tabla original, se registró el gate async en `graph/gates/pending/T-20260821-002-redo.md`, y se reimplementó — mismo resultado, esta vez con rastro de proceso completo. `tsc --noEmit` limpio, verificado después del corte del circuit breaker (ver nota en `progress.md`).
- [x] Modelar horarios semanales en la base de datos (tabla + migración)
    - id: T-20260821-003
    - type: schema
    - path: db/schema/enums.ts, db/schema/class-schedules.ts, db/schema/relations.ts, db/schema/index.ts, db/policies/0003_class_schedules_rls.sql, db/migrations/0004_nappy_mattie_franklin.sql, tests/integration/tenant-isolation/rls-policies.test.ts
    - description: Tabla `class_schedules` por tenant — día de la semana, hora de inicio/fin, nombre de actividad. `tenant_id` + RLS igual que el resto de las tablas. Scope v1 estrictamente declarativo (sin cupo/instructor/reservas), por decisión de marketing registrada en T-20260821-004.
    - notes:
      - 2026-08-21: usuario confirma que tiene que existir la tabla en la base — no es una vista estática. "Se supone que esto es para los gym boxes etc, entonces debería existir una que lo muestre."
      - 2026-08-21: usuario confirma que lo editan owner Y staff (empleado del panel), nunca el member. Falta implementar enforcement de rol por `staff` en general en el proyecto (ver `lib/auth/require-role.ts` en `PRODUCT.md`) — este feature hereda esa misma pendiente, no es nueva.
    - severity_flag: tratada como severidad **high** (regla de oro de `AGENTS.md` + `unclassified_action_default: high` de `policy.yml`) — gate síncrono con aprobador nombrado antes de correr la migración contra la base real.
    - gate: `graph/gates/pending/T-20260821-003.md` — aprobado por SudacaDev el 2026-08-21 ("apruebo correr el npm run db:migrate"), no movido a `gates/approved/` por el invariante de `roles/registry.yml` (ningún rol automatizado escribe ahí).
    - resultado: `npm run db:migrate` corrido y verificado contra la base real — tabla `class_schedules` con 8 columnas, `relrowsecurity`/`relforcerowsecurity` en `true`, policy `tenant_isolation` (`ALL`) presente. Migraciones `0001`-`0003` de `db/policies/` reaplicadas sin cambios (idempotentes, como exige el patrón).

## Convención
Cada tarea que un agente tome de acá debe, al completarse, dejar rastro en
`graph/sessions/progress.md` — no alcanza con tildarla acá.
Comandos de backlog soportados: `#task`, `#run`, `#run-all`, `#done`,
`#skip`, `#note` — ver `graph/README.md` para la convención completa.


## Backlog Execution Policy
El backlog se interpreta como un grafo dirigido de dependencias, no como una
lista plana. El orden visual es solo presentacion: no autoriza ejecutar una
tarea si sus prerrequisitos no estan completos.

Antes de ejecutar `#run`, `#run-all` o `#done`, el runner debe leer y unir los
campos `depends_on`, `blocked_by`, `requires`, `parent` y `prerequisite`. Cada
valor debe apuntar a IDs estables `T-YYYYMMDD-NNN`. Si una dependencia falta,
esta pendiente, fallo, fue salteada o no puede validarse con certeza, la tarea
queda bloqueada y el evento debe registrarse en `progress.md`.

`#run-all` solo puede avanzar por tareas cuya clausura de dependencias este
completada. Si encuentra una rama bloqueada o una tarea salteada aguas arriba,
debe frenar esa ejecucion hasta que una persona o planner re-planifique la rama.

## Metadata de tarea
Las tareas pueden llevar un bloque de metadata indentado debajo de la línea de
la tarea, para que los agentes y el gestor del backlog puedan leer campos como
`type`, `path`, `file`, `community`, `priority`, `description`, etc.

El campo `id` (`T-YYYYMMDD-NNN`, contador por día) es la referencia estable
de la tarea: no se pisa nunca y no depende de la posición actual en
`### Tareas pendientes`. `#run`, `#done`, `#skip` y `#note` aceptan tanto la
posición entre pendientes como este ID — usá el ID para referenciar una
tarea mencionada en un turno anterior, porque la posición se corre si de
por medio se completó, salteó o agregó otra tarea.
