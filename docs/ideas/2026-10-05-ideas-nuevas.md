# Ideas nuevas para BoxFlow — 2026-10-05

Revisado antes de proponer: `PRODUCT.md`, `.agents/graph/sessions/progress.md`, `.agents/graph/sessions/tasks.md`,
`db/schema/*` y el código en `app/`, `features/`, `lib/`. Las tres ideas de abajo **no existen hoy en el repo**
(verificado: no hay importador CSV, `payments` no guarda método de pago, no hay noción de "socio en riesgo").

## 1. Importador de planilla (onboarding sin tipeo)

- **Problema:** `PRODUCT.md` dice que BoxFlow reemplaza "cuaderno y planillas". Un box con 80–150 socios en un Excel
  tiene que tipear todo a mano antes de ver un dashboard con datos reales; ahí se pierde la promesa de "cero curva".
- **Encaje (no-cadena):** las cadenas migran con un equipo de onboarding. Acá el dueño sube su planilla y listo,
  sin manual ni soporte. Refuerza el principio 2 (cero curva de aprendizaje).
- **Alcance mínimo:** subir CSV/pegar desde Excel → mapeo automático de columnas (nombre, teléfono, email, plan,
  vencimiento) → pantalla de vista previa con errores marcados → crea `members` y `memberships` en lote.
- **Esfuerzo:** medio (~1 semana). Sin migración de schema; endpoint de lote + una pantalla en el onboarding.
  Riesgo: planillas muy desprolijas; mitigar con vista previa obligatoria.

## 2. Cierre de caja del día (método de pago + arqueo)

- **Problema:** el diálogo de pago ya habla de "efectivo o transferencia" (`payment-form-dialog.tsx`), pero
  `payments` y `walk_in_sales` no guardan el método ni quién cobró. Al cerrar el día el dueño no puede cuadrar
  la plata del cajón contra lo registrado.
- **Encaje:** es el "mostrador" real de un box chico (principios 3 y 4: el dashboard responde de un vistazo).
  Una cadena tiene tesorería; el dueño de un solo box tiene un cajón y un celular.
- **Alcance mínimo:** columna `method` (efectivo/transferencia/otro) y `received_by` en pagos y ventas rápidas;
  una vista "Hoy" con total por método y por persona que cobró. Respeta que `payments` es append-only (campos
  nuevos solo al insertar).
- **Esfuerzo:** chico–medio (3–4 días). Una migración, un selector de un tap en los dos formularios de cobro,
  una vista de lectura. Gate `high` por migración, según el flujo del repo.

## 3. "Socios que dejaron de venir" (retención en un vistazo)

- **Problema:** el dashboard muestra quién vence, pero no quién sigue pagando y dejó de venir, que es el
  que se va el mes siguiente. El dueño lo nota recién cuando no renueva.
- **Encaje:** usa datos que ya existen (`checkins` + membresía vigente), sin pedir nada nuevo al socio. Es una
  lista corta ("sin venir hace 14+ días"), no un módulo de analytics, así que respeta "un vistazo, una respuesta".
- **Alcance mínimo:** chip/lista en el dashboard con nombre y días sin venir, y un botón `wa.me` con mensaje
  prellenado (un tap, sin API ni automatización).
- **Esfuerzo:** chico (2–3 días). Una query de lectura + un componente; sin schema nuevo.

## Ideas rondadas pero NO propuestas (ya están en el repo, evaluadas o diferidas)

- **Cobro online / Mercado Pago:** ya anotado como "idea to revisit, not decided" en `.env.local.example`.
- **Automatización por WhatsApp:** explícitamente diferida en `db/schema/leads.ts` ("separate, larger backlog item").
  La idea 3 usa solo un link `wa.me` manual para no pisar ese ítem.
- **Credencial QR/NFC del socio:** `app/api/v1/checkins/route.ts` la marca fuera de alcance mientras los socios
  no tengan login; T-20260827-009 (mostrar `checkinCode`) cubre lo adyacente.
- **Cupos, lista de espera, instructor por clase, leads, kiosco, ficha de salud, cumpleaños/DNI:** ya construidos.

## Orden sugerido

1. Socios que dejaron de venir (más barata, valor inmediato)
2. Cierre de caja (necesita migración)
3. Importador (más trabajo; mayor impacto en adopción de boxes nuevos)
