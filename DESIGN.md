---
name: BoxFlow
description: The Box Ledger — a dark, blunt, front-desk gym operating system, not a chain-scale admin console.
colors:
  volt: "#ccff00"
  volt-hover: "#b8e600"
  blackout: "#0a0a0a"
  charcoal-panel: "#141414"
  soot: "#1c1c1c"
  hairline: "#232323"
  warm-gray: "#8a8a86"
  chalk: "#f2f2f0"
  alert-red: "#ef4444"
  signal-green: "#ccff00"
  alert-amber: "#ff8a4c"
  info-blue: "#60a5fa"
typography:
  display:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  md: "9999px"
  lg: "9999px"
  xl: "9999px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.volt}"
    textColor: "{colors.blackout}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.volt-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  dialog-content:
    backgroundColor: "{colors.charcoal-panel}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.xl}"
    padding: "16px"
  status-badge-active:
    backgroundColor: "#1f2400"
    textColor: "{colors.signal-green}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-alert:
    backgroundColor: "#2a1c13"
    textColor: "{colors.alert-amber}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  status-badge-info:
    backgroundColor: "#132036"
    textColor: "{colors.info-blue}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: BoxFlow

## Overview

**Creative North Star: "The Box Ledger"**

BoxFlow's screens read like a front-desk ledger that got fast instead of decorated: near-black surfaces, one loud accent color reserved for money and action, and dense rows of data (stat pairs, a check-in sparkline, a vencimientos calendar, a top-socios leaderboard) laid out to be scanned in a glance, not studied. There is no light theme — `:root` and `.dark` are intentionally identical — because this product has exactly one register: dim, high-contrast, always-on, built for a phone or tablet at the entrance. Nothing here tries to look premium or soft; the aesthetic is a direct extension of BoxFlow's own positioning against chain-gym software — blunt, operational, unbothered by ornament.

Depth comes from tonal layering (background → panel → hairline border), never from shadows. Hierarchy comes from scale and weight (a 72px Archivo Black revenue number next to 11px tracked-uppercase labels), not from color variety — the Volt accent is spent on maybe three things per screen: the primary CTA, the active nav/today marker, and the hero number's accent details. Everything else stays gray-on-black.

**Key Characteristics:**
- Dark-only, high-contrast, zero light-mode fallback.
- One accent color (Volt, a saturated lime-green), spent sparingly on CTAs, active states, and the hero metric.
- Every interactive surface — buttons, inputs, cards, dialogs — is fully rounded (pill/stadium shape), not the tight small-radius corners of earlier iterations of this system.
- Flat by construction: no shadows anywhere in the codebase; depth is tonal-step + hairline-border only.
- Archivo Black, uppercase, tight-tracked for every heading and label; regular Archivo, sentence case, for all reading text.
- Status conveyed through a consistent dot-plus-pill badge (active/alert/neutral/info), never through icon-only or color-only signaling.
- Dashboard leads with one hero number, not a grid of equal-weight cards — this is a deliberate product principle (see PRODUCT.md), not a default layout choice.

## Colors

Almost monochrome by design — the palette is a near-black neutral scale plus one saturated accent, with a small, fixed set of semantic status colors layered on top for alerts, success, and info states.

### Primary
- **Volt** (#ccff00): The one accent. Used on primary CTAs, the active nav underline/today marker, the check-in sparkline line, and brand marks (dumbbell icon, "BoxFlow" wordmark accents). Never used decoratively — every appearance ties to an action or a "you are here" state. Replaced the system's original orange accent (2026-08-25) — same role, new hue, picked to echo the lime/volt-green identity of a reference competitor app the owner liked.
- **Volt Hover** (#b8e600): Hover/press state for the primary accent — a darker step, not a brighter one, since Volt already sits near peak brightness and there's little headroom to lighten further. Never appears at rest.

### Neutral
- **Blackout** (#0a0a0a): App background. The darkest surface in the system.
- **Charcoal Panel** (#141414): Card, popover, and muted-surface background — one tonal step above Blackout.
- **Soot** (#1c1c1c): Secondary/accent surface fill and the subtle-border color; also the resting background for `secondary` buttons.
- **Hairline** (#232323): Standard border and input-stroke color — the workhorse divider throughout tables, cards, and dialogs.
- **Warm Gray** (#8a8a86): Muted foreground text — labels, meta text, secondary copy.
- **Chalk** (#f2f2f0): Primary foreground. Near-white, never pure white, to stay warm against Blackout.

### Semantic (status system)
- **Signal Green** (#ccff00): Positive status — active membership badges, upward revenue trend. **Intentionally identical to Volt** (2026-08-25, owner's explicit call, not an oversight): the accent and the "active" status now share one hex value. This does trade away a distinction the system used to make for free — a primary CTA and an "active member" badge can now read as the same color at a glance — accepted knowingly in exchange for a simpler one-green palette instead of introducing a second saturated hue.
- **Alert Amber** (#ff8a4c): Attention status — expiring-soon badges, vencimientos calendar dots, the "vencen en 7 días" stat when non-zero. Distinct from the destructive red; this is "act soon," not "something failed."
- **Alert Red** (#ef4444): Destructive status — failed states, destructive button variant, form errors.
- **Info Blue** (#60a5fa): Neutral informational status — currently scoped to the check-in "inside" badge only.

Each semantic color pairs with its own low-saturation dark background tint when used as a badge fill (e.g. Signal Green on `#1f2400`, Alert Amber on `#2a1c13`, Info Blue on `#132036`) rather than a translucent overlay — see Components → Status Badges.

### Named Rules
**The One Voice Rule.** Volt is the only saturated, high-chroma color the system introduces — Signal Green isn't a second one, it deliberately reuses the exact same value (see Semantic, above). Every other color is either a neutral gray step or a desaturated-background/saturated-text semantic pair. If a new element wants a color that isn't already in this set, it's wrong — route it through the existing semantic set or make it gray.

## Typography

**Display Font:** Archivo Black (with Arial Black, sans-serif fallback)
**Body Font:** Archivo (with ui-sans-serif, system-ui, sans-serif fallback), weights 400–700

**Character:** Archivo Black carries every heading, label, and number that needs to command attention — always uppercase, always tight-tracked, blunt rather than elegant. Regular Archivo handles everything meant to be read rather than scanned, at sentence case with a more generous line-height.

### Hierarchy
- **Display** (400, clamp(2.25rem, 6vw, 4.5rem)/1, -0.02em): The single hero number per screen — dashboard revenue (72px), marketing hero title (36–60px responsive). Only one Display element per screen; this is what "one glance, one answer" looks like in type.
- **Headline** (400, 1.875rem/1.2, -0.02em): Page-level titles ("Dashboard", "Todavía no cargaste nada", the marketing final-CTA line). Always uppercase.
- **Title** (400, 0.875rem/1.3, -0.01em): Panel and section titles ("Vencimientos", "Top socios", dialog titles). Always uppercase, tighter than body text.
- **Body** (400, 0.875rem/1.6): Paragraphs, form values, table cells, benefit copy. Sentence case; the only role that isn't uppercase or tracked.
- **Label** (700, 0.6875rem/1, 0.08em, uppercase): Eyebrows, stat labels, nav links, table headers, status badge text. The system's most-used text role — anywhere a short word needs to feel like a tag rather than a sentence.

### Named Rules
**The Shout-or-Read Rule.** A text element is either Display/Headline/Title/Label — uppercase, tracked, Archivo Black or bold — or it's Body — sentence case, regular weight, relaxed leading. There is no in-between register; don't create a heading that's capitalized-but-not-uppercase, or a label that isn't tracked.

## Layout

Content sits in a constrained column (marketing pages use `max-w-3xl`–`max-w-5xl` per section; the owner app shell caps at `max-w-[1580px]`), with generous horizontal breathing room on desktop (`px-14`) collapsing to `px-8` on mobile. Vertical rhythm is section-based: each marketing section is a full-bleed block with its own `border-t`/`border-b` hairline and heavy padding (`py-16`–`py-24`), rather than a continuum of equal-weight cards.

Inside the app, the dashboard is a single vertical stack (`space-y-10`) of unequal blocks — one hero block, then a two-column grid (`lg:grid-cols-2`) for the calendar/sparkline pair, then full-width list panels (leaderboard, activity feed) — collapsing to a single column below `lg`. Data lists (leaderboard rows, activity rows, expiring-member rows) are hairline-divided stacks, not bordered cards — the divider *is* the row boundary.

## Elevation & Depth

Flat by construction: there is no `box-shadow` anywhere in the implemented feature set. Depth is conveyed entirely through two mechanisms — a tonal step between background and surface (Blackout → Charcoal Panel), and a 1px hairline border (Hairline or the subtler Soot) around cards, tables, and dialogs. State (today's calendar cell, the active nav link) is marked with a 2px accent underline/border, never a lift or a glow.

### Named Rules
**The Flat-By-Default Rule.** No shadows, anywhere, ever. If something needs to read as "above" the surface, give it a lighter background tone and a hairline border — not a shadow. This is a deliberate invariant of the system, not an oversight to fix later.

## Shapes

Two tiers, not one flat pill everywhere (revised 2026-08-25, same day as the pill change itself — the first pass tried a single `--radius: 9999px` for the whole scale and broke on real content, see below):

- **Controls** (buttons, inputs, chips, status badges/dots): fully rounded (pill/stadium), driven straight by `--radius: 9999px` in `app/globals.css`. These are single, short blocks of content — height ≈ the text/icon inside plus padding — so the browser's automatic "cap the radius at half the box's shorter side" produces a clean pill with nothing for the curve to compete with. **Exception: `<textarea>`.** It reads as a form control but isn't single-line — found uncapped (full pill) on two multi-row textareas (member health notes, operational request description), producing the same ovalized look as an uncapped container. Treat `<textarea>` as a multi-row container for radius purposes — capped (`rounded-cap-md-12`), never the flat control pill.
- **Multi-row/multi-cell containers** that clip their own content (`overflow: hidden`/`overflow-x: auto` around a list, a table, a month grid, a dialog panel): a **capped** radius instead — `rounded-cap-xl-20` (or `rounded-cap-md-12` for the smaller `table.tsx` wrapper) — 20px/12px flat values, not derived proportionally from the flat `--radius`. The bug the first pass produced: a tall container (several rows of real content) also gets capped at half its own height by the same automatic browser rule, but half of "several rows" is still a huge radius relative to any single row inside it — the curve ate into the first and last row's padding and visibly clipped text (found on the Check-in member list, present the same way in every dialog and every `<Table>` in the app before this fix). The `min()` capping pattern isn't new — `components/ui/button.tsx`'s `xs`/`sm`/`icon-xs`/`icon-sm` sizes already capped their own radius this way before the pill change, for an unrelated reason (keeping very small buttons from looking like bulbous circles); this just applies the same existing pattern to containers.

There is no zero-radius geometry anywhere, and no third radius value beyond these two — a new multi-row/clipping container reaches for the 20px (or 12px, `table.tsx`-style) cap, not a fresh number.

**Use the `rounded-cap-{base}-{px}` utility classes (`app/globals.css`, `@theme inline`), never `rounded-[min(var(--radius-X),Ypx)]` directly (2026-08-27).** The bracket form broke the build repeatedly: Tailwind's arbitrary-value brackets can't contain a raw space, and CSS formatters (VS Code's built-in CSS formatter among them) routinely add a space after the comma in `min(a, b)` on save, silently producing `Cannot apply unknown utility class` errors on the next compile. The fix moved each `min(var(--radius-X),Ypx)` combo into a theme token (`--radius-cap-{base}-{px}`) once in `globals.css` — where a space after the comma is completely normal, valid CSS — and Tailwind auto-generates the matching `rounded-cap-{base}-{px}` utility (plus its directional variants, `rounded-b-cap-xl-20` etc.) from that token, same as any other `--radius-*` key. Existing tokens: `rounded-cap-md-10`, `rounded-cap-md-12`, `rounded-cap-lg-12`, `rounded-cap-lg-16`, `rounded-cap-lg-20`, `rounded-cap-xl-20`. Need a combo that doesn't exist yet? Add the token in `globals.css` next to the others, don't reach for the bracket syntax.

## Components

Every interactive control is compact, uppercase-labeled where it carries text, and built to be operated at speed from a front desk — not admired.

### Buttons
- **Shape:** fully rounded (pill), same as every other surface now — see Shapes, above.
- **Primary:** Volt background, Blackout text, bold uppercase tracked label, `hover:bg-primary-hover` (Volt Hover). Marketing CTAs run larger (`16px 32px` padding); in-app buttons run compact (`h-8`, `px-2.5`).
- **Outline:** transparent background, Hairline border, hover fills to Charcoal Panel/Soot.
- **Ghost:** transparent at rest, hover fills to Soot-ish muted tone, no border.
- **Secondary:** Soot background, Chalk text.
- **Destructive:** low-opacity Alert Red fill (`bg-destructive/10`) with Alert Red text, not a solid red block — matches the system's "tint, don't block" semantic-color pattern.
- **Press feedback:** buttons nudge down 1px on active (`translate-y-px`) instead of any shadow or scale change.

### Status Badges (signature component)
A pill with a small solid dot plus uppercase tracked text, always on a dark, low-saturation tint of the status color rather than a translucent overlay of it. Four variants observed: **Active** (Signal Green/Volt on `#1f2400`), **Alert** (Alert Amber on `#2a1c13`), **Info** (Info Blue on `#132036`, used for check-in "inside" state), **Neutral** (Warm Gray family on `#1e1e1e`). This is the system's primary way of communicating state anywhere a member's status, a check-in state, or a membership condition needs to be scanned at speed — always this badge, never a bare colored word or an icon alone. Already fully pill-shaped before the 2026-08-25 shape change, so it's visually unchanged by it.

### Cards / Containers
- **Corner Style:** capped 20px (or 12px for the `table.tsx` wrapper) — see Shapes, above. A single, un-clipped card (no `overflow-hidden`, e.g. a dialog's outer popup before this fix) would have been fine at the full pill radius; the cap applies wherever a container groups multiple rows/cells and clips them, which in practice is every card-like container in this app, so treat "card/container" and "capped 20px" as the same thing by default here.
- **Background:** Charcoal Panel on Blackout.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 1px Hairline (or Soot for a quieter, subtle divider).
- **Internal Padding:** generous for empty/onboarding states (`px-8 py-16`), compact for dialogs (`p-4`).

### Inputs / Fields
- **Style:** transparent background, 1px Hairline border, fully rounded, 32px height.
- **Focus:** border shifts to the ring color plus a 3px soft focus ring (`focus-visible:ring-3 ring-ring/50`) — no glow or shadow.
- **Error:** border and ring shift to Alert Red at reduced opacity (`aria-invalid`).
- **Disabled:** background tints toward Soot at 50% opacity.

### Navigation
A fixed vertical sidebar (`app/(owner)/owner-nav.tsx`), not a top bar: brand mark, then one grouped section ("Gestión") of uppercase, tracked, bold micro-label (Label role) rows, each with a leading icon. State is a 2px left border — transparent at rest, Volt when the route is active — plus a same-tone `--accent` background fill on hover and on the active row (the one spot in the system where nav gets a background, to read as a selected row rather than a link). Below the `md` breakpoint the sidebar collapses to an icon-only rail (labels hidden, icons centered, no toggle/JS) so it stays usable on the phone/tablet check-in device.

### Data Panels (signature pattern)
The dashboard's calendar, sparkline, leaderboard, and activity feed all share one construction: a Title-role panel header (title + small meta label), a `border-t` hairline rule, then hairline-divided rows below. No panel gets its own card background or shadow — the hairline rule against the shared Blackout background is the entire container.

## Do's and Don'ts

### Do:
- **Do** spend Volt only on primary actions, active/current state, and the one hero metric per screen.
- **Do** build any new status indicator as a dot-plus-pill badge on a dark semantic-tint background, matching the existing Active/Alert/Info/Neutral set before inventing a new color.
- **Do** use uppercase, tracked Archivo Black/bold for anything that functions as a label, heading, or number-to-be-scanned; keep reading paragraphs in regular-weight sentence case.
- **Do** convey elevation with a tonal background step plus a 1px hairline border.
- **Do** round every interactive/containing surface fully (pill) — there's no "tight" radius option left in the scale to reach for.

### Don't:
- **Don't** add `box-shadow` anywhere — depth is tonal-step-and-hairline only, by deliberate invariant, not by omission.
- **Don't** introduce a light theme or a second color mode; `:root` and `.dark` are intentionally identical.
- **Don't** add a color outside this palette; Signal Green reusing Volt's exact value was a deliberate, documented exception, not a precedent for inventing further overlaps casually.
- **Don't** turn the dashboard into an equal-weight card grid — the single hero-number-plus-secondary-stats layout is a product decision (see PRODUCT.md), not a placeholder.
