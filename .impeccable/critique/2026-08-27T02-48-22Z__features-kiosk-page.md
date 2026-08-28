---
target: features/kiosk-page, features/members-page, features/staff-page, features/leads-page, features/operational-requests-page
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-27T02-48-22Z
slug: features-kiosk-page
---
Method: dual-agent (A: a2680f98082b107f5 · B: ad9d734a08af05507)

**Scope**: `/kiosk` (Cobro Rápido), `/members` (Socios), `/staff` (Equipo), `/leads` (Prospectos), `/operational-requests` (Necesidades) — calibrated against `/schedules` (Horarios), the one screen the user has explicitly approved.

**Live-inspection blocker (both assessments)**: neither sub-agent's browser tab carried an authenticated session — all 5 routes redirected to `/sign-in`. This entire critique is source-code-based (`.tsx`/`.module.css` read directly), cross-referenced against `DESIGN.md`/`PRODUCT.md`, not a live visual read. No overlay is visible in any browser tab; there is no fallback signal beyond the sign-in redirect itself.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of system status | 2/4 | Loading = bare "Cargando..." text, no skeleton; save success closes the dialog silently, no toast |
| 2 | Match between system & real world | 3/4 | Strong domain vocabulary (Socios/Equipo/Prospectos/Necesidades, "Dar de baja", "Fichar entrada/salida"), correct es-AR currency — but zero visual referents (no member photos, no product images) |
| 3 | User control and freedom | 2/4 | Destructive "Dar de baja" runs through the raw browser `window.confirm()` — no in-app cancel path, no visible undo despite being a soft-delete server-side |
| 4 | Consistency and standards | 2/4 | Internally consistent across these 5 screens, but a sharp drop vs. `/schedules`/dashboard; the native `confirm()` breaks the custom dark shell outright |
| 5 | Error prevention | 2/4 | Confirm-before-delete exists but via OS dialog, not a styled destructive dialog; no distinction between "load failed" and "genuinely empty" |
| 6 | Recognition rather than recall | 2/4 | Data is shown directly (good), but no color/icon scanning aids — every row is same-weight text, forcing full reads |
| 7 | Flexibility and efficiency of use | 1/4 | Only Staff has search; Members/Leads/Necesidades have no search, sort, or pagination |
| 8 | Aesthetic and minimalist design | 2/4 | Sparse but *under*-designed, not deliberately reduced — this is the literal shape of the user's complaint |
| 9 | Help recognize/diagnose/recover from errors | 2/4 | Errors are a single small red line above the table, easy to miss, no retry affordance |
| 10 | Help and documentation | 1/4 | No inline help, tooltips, or onboarding hints anywhere on these 5 screens |
| **Total** | | **19/40** | **Poor** |

## Design Specificity Verdict

**LLM assessment**: No — these five screens could ship unchanged, copy swapped, for any generic admin CRUD product (inventory tool, support-ticket queue, CRM). They correctly *consume* the design system's atoms (Archivo Black headers, `StatusPill`, hairline `Table`, pill buttons) but contribute zero compositional authorship: no domain-specific visual language, no grouping, no empty-state design, no hierarchy past "header, then flat table." `/schedules` proves the team can do considered, product-specific layout (three view modes, a real weekly grid, a designed empty-cell `+` micro-interaction, day-grouped kanban cards) — which reframes the five flagged screens as an attention/scope gap, not a capability gap: wiring finished, design pass skipped.

**Deterministic scan**: `detect.mjs --json` against all 5 target directories returned **0 findings**, exit code 0 — confirmed genuine (not a config artifact) via a `--no-config` re-run and a positive-control synthetic file that did trigger 2 findings, proving the rule engine was live. This is not a clean bill of health: `detect.mjs`'s rules target CSS-syntax anti-patterns (overused fonts, banned easings, `transition: all`), and none of these five screens' problems are that kind of issue — they're compositional and structural (missing empty-state design, missing search/sort, a raw `window.confirm()`, an under-designed Kiosk layout), which sits entirely outside what a regex-based CSS/markup scanner can see. No false positives to flag; there was nothing for the detector to catch here either way, and that's the finding worth naming — this class of problem needs the design-review pass, not the mechanical one.

**Visual overlays**: not available. Both agents hit the same authentication wall — every route redirected to `/sign-in` before any script injection could run. No overlay is visible in any tab; treat this critique as source-grounded, not confirmed against rendered output.

## Overall Impression

These five screens read as wired-but-unstyled: functionally complete, systemically compliant (they use the right tokens, the right components), and visually inert. The gap isn't a broken design system — it's that nobody spent a design pass on these screens the way one clearly was spent on `/schedules`. The single biggest opportunity is Members ("Socios"): it's the screen most directly tied to BoxFlow's own stated purpose ("know who's paid, who's about to expire") and today it's the one screen with the least information on it.

## What's Working

- **Token-level system compliance is real**: Staff/Leads/Operational-Requests correctly route every status through `StatusPill` with the right semantic tones (leads nuevo→info, convertido→success, perdido→danger; requests open→alert, resolved→success) instead of inventing new colors. The foundation isn't the problem.
- **Interaction feedback details exist, if thin**: disabled+relabeled buttons mid-action ("Vendiendo...", pending toggle states), table row hover — someone was thinking about state, just not about layout.
- **`/schedules` is proof of capability, not just contrast**: its empty-cell `+` icon, day-grouped kanban columns, and hairline weekly grid show the team can produce a screen that feels authored for "when is class happening" — which sharpens rather than softens the criticism of the other five.

## Priority Issues

**[P0] Native `window.confirm()` on every destructive action**
Why it matters: `features/members-page/hooks/useMembers.ts:41` and `features/staff-page/hooks/useStaff.ts:49` both gate "Dar de baja" behind the raw browser `confirm()` — an unstyled OS popup breaking out of an otherwise fully custom dark shell, on the single riskiest action on the screen. This is the single most visible, concrete proof of "unfinished."
Fix: replace with the app's own dialog primitive (`DialogContent`/`DialogFooter` spec from DESIGN.md), consequence copy, destructive-button pairing.
Suggested command: `/impeccable harden`

**[P0] Members ("Socios") list shows no membership/payment status at all**
Why it matters: `features/members-page/index.tsx` renders only Nombre/Código/Email/Teléfono/Acciones — no `StatusPill`, no "vence en X días" — despite PRODUCT.md stating the product's entire purpose is knowing who's paid and who's about to expire, without producing a report. The one screen listing every member omits the one fact that matters most.
Fix: add a Status column using the existing `StatusPill`, default-sorted by soonest-expiring.
Suggested command: `/impeccable layout`

**[P1] Kiosk conflates four jobs with no visual separation**
Why it matters: catalog CRUD, single-tap sale, day-pass sale, and (owner-only) revenue total all sit on one flat page with a plain text sub-header as the only division (`features/kiosk-page/index.tsx`) — and this is the exact screen the user screenshotted, and the highest-speed screen in the product per "the door doesn't wait."
Fix: give "Vender" primary visual weight/larger tap target, demote catalog management to a secondary affordance, split into distinct capped-radius panels per DESIGN.md's Card spec.
Suggested command: `/impeccable layout`

**[P1] Every empty state is an unstyled one-line `<p>`**
Why it matters: this is the user's literal complaint, verbatim, and it's the first thing a new tenant sees on 4 of 5 screens.
Fix: one reusable `EmptyState` component (icon/line-art, headline-role message, inline primary CTA) used everywhere instead of `styles.emptyText`.
Suggested command: `/impeccable delight`

**[P2] No search/filter/sort on Members, Leads, or Operational Requests**
Why it matters: only Staff has a search input; as lists grow past a screenful there's no efficient way to find a record.
Fix: reuse the Staff search pattern app-wide; default-sort by relevance (expiring-soonest for Members, open-first for Necesidades).
Suggested command: `/impeccable optimize`

## Persona Red Flags

**Alex (power user, front-desk speed)**
- Kiosk's product card packs "Vender" next to "Editar"/"Borrar" at near-identical visual weight (`features/kiosk-page/index.tsx:95-119`) — a fast tap mid-rush risks landing on "Borrar" instead of "Vender."
- No cross-link from a member on the Members table to the dashboard's vencimientos context — Alex has to context-switch screens to correlate "who's expiring" with "who's this."
- `window.confirm()` halts a fast workflow with a slow, out-of-flow modal that matches nothing else in the app.

**Casey (tablet at the entrance)**
- Kiosk's day-pass row (three fields + button, `flex flex-wrap`) will wrap awkwardly on a mid-size tablet in portrait with no grouping cue once wrapped.
- Action buttons in every table (`Ver`/`Editar`/`Dar de baja`, or Staff's four-button row) sit cramped in a `whitespace-nowrap` cell — real fat-finger risk, no spacing safeguard.
- `window.confirm()` renders tiny native-OS buttons on a touch device, easy to mis-tap versus the app's normal large pill controls.

**Riley (edge cases / empty states)**
- `useMembers.loadMembers()` and `useStaff.loadStaff()` have **no error handling on a failed GET** — if the API 500s or the tablet's wifi drops mid-load, the UI silently shows "Todavía no hay socios." — identical to a genuinely empty, brand-new tenant. This is a real bug, not just a polish gap.
- Staff correctly distinguishes "Todavía no invitaste a nadie" (zero data) from "No hay resultados" (zero search matches) — but this distinction exists nowhere else, so a future Members/Leads search would collapse both cases into one misleading message.

## Minor Observations

- Staff table's "Categoría" column is plain text while the adjacent "Estado" column is a `StatusPill` — inconsistent treatment of two adjacent categorical columns in the same row.
- Operational Requests' "Categoría" renders a bare "—" when absent, with no visual distinction from a populated pill.
- Leads have no aging/urgency cue — a "Nuevo" lead from 2 weeks ago looks identical to one from 5 minutes ago.
- No zebra striping or row density control; Staff's 6-column table with `whitespace-nowrap` will force horizontal scroll on narrower tablet viewports.
- Members' short-code cell is mono/tracked but has no scan/QR affordance despite being the check-in identifier.
- Currency formatting (`Intl.NumberFormat("es-AR")`) is correctly applied — a genuine, unremarked-on positive.

## Questions to Consider

1. If `/schedules` earns your approval through three real view modes and a designed empty-cell interaction, and these five screens are Table + StatusPill with nothing added — is that a time-budget gap worth closing later, or a signal that "Operate" screens (day-to-day admin) have been quietly deprioritized relative to "flagship" ones?
2. Members is the screen most directly tied to your own stated purpose and it's the one screen with the least information on it — is Socios actually used daily, or has real usage already migrated entirely to the dashboard, leaving this list to become an address book nobody designed for?
3. Kiosk carries four separate jobs with zero separation and it's the exact screen you flagged — before touching any visual styling at all, would splitting it into "Vender" (huge tap targets, front-of-house) versus "Catálogo" (small print, back-office CRUD) change how it feels at the counter?
