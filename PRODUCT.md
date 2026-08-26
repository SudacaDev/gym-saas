# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: the owner of an independent, single-location "box" or studio — CrossFit, functional training, pilates, yoga. They run the front desk themselves (no IT staff, no back office), typically from a phone or a tablet at the entrance. Their job: know who's paid, who's about to expire, and who walked in today, without a notebook or loose spreadsheets.

Secondary user: staff members the owner brings on. Staff can do everything the owner can on members, plans, payments, and check-ins, but cannot touch account-level configuration or billing (**decided in this session** — not yet reflected in the UI, which currently has no staff-specific screens; `staff` exists in `user_role` but permission enforcement is still to be built).

Members themselves are not BoxFlow users — they don't sign up or log in. They're managed as records by the owner/staff (check-in via QR/NFC, payment receipts by email through Resend). Only the person creating the tenant (the gym owner) signs up and is stamped `role: owner`.

## Product Purpose

BoxFlow replaces the notebook-and-spreadsheet way independent boxes/studios track members, plans, payments, and door check-ins, with one shared, always-current record. Success looks like: alta of a member/plan happens once and stays visible everywhere (no "who paid this month?"), check-in at the door is fast and doesn't need the owner's attention, and the owner can glance at the dashboard and know where they stand — this month's revenue, active members, upcoming expirations, today's check-ins — without producing a report.

## Positioning

BoxFlow is explicitly not a scaled-down version of gym-chain software. Chain-oriented tools are built for multi-location operations with an IT department and a onboarding manual; BoxFlow is built only for the single-location case, so it can stay simple where those tools can't — no features the owner will never touch, no admin console, no per-location config. The product's stance in its own copy: "no somos como los demás" — not lighter enterprise software, but software scoped to a different, smaller job. Multi-tenant underneath (Supabase Postgres + RLS, one tenant per gym), but each tenant experiences a single-box tool, not a scaled-down enterprise one.

## Operating Context

- **Market:** Latin America, Spanish-speaking (**decided in this session**). Argentina is the initial/current market — UI copy, currency formatting (ARS via `Intl.NumberFormat("es-AR")`), and locale (`es-AR`) are all Argentina-specific today — but the product is meant to extend to other Spanish-speaking countries and currencies, not stay AR-only by design.
- **Where it's used:** at the gym's front desk/entrance, in the moment — check-in needs to not create a line; the dashboard is a glance-and-move-on read, not a report someone sits down to study.
- **Roles:** `owner`, `staff`, `member` (business role, stamped onto Supabase `auth.users.app_metadata.role`). Only owner and staff hold accounts; members are data, not users.
- **Core objects:** Tenant (one per gym/box), Member, Plan (billing period: monthly/quarterly/yearly), Membership (a Member subscribed to a Plan; status: active/paused/cancelled/expired), Payment (append-only; status: pending/paid/failed/refunded), Check-in (method: manual/qr/nfc).
- **Onboarding:** sign-up creates the Tenant and the first `owner` user in one step (no separate org-creation flow); the owner then creates their first Plan and adds their first Member before the dashboard shows real data.

## Capabilities and Constraints

- Multi-tenant SaaS: Next.js (App Router) + Supabase (auth + Postgres) + Drizzle ORM, tenant isolation enforced via Postgres RLS policies (see `db/policies/`).
- Payment records are append-only — a failed or refunded payment is a new row, never an in-place edit of amount/status.
- Payment receipts are emailed via Resend; members have no login to view them in-app.
- Public API exists under `app/api/v1/` for checkins, members, memberships, payments, plans.
- Staff permission enforcement (staff = full operational access, no account/billing config) is a decided direction, not yet built — `lib/auth/require-role.ts` is the place this logic belongs when implemented.
- Pricing model is undecided — do not invent a price, tier structure, or billing model. The home page marks this explicitly (`[PRECIO]: todavía no definimos el precio real`); treat that as current truth until the user updates it.

## Brand Commitments

- Name: **BoxFlow**. Tagline positioning: "Tu box no necesita un sistema para cadenas."
- Voice: direct, informal Argentine Spanish, speaks to the owner as a peer running their own front desk ("vos", not "usted"). Confident and a little wry about enterprise software ("Hay sistemas hechos para cadenas... vos no tenés nada de eso").
- Current visual identity (dark theme, Archivo / Archivo Black typography, dumbbell mark) is an existing, deliberate implementation — see `app/layout.tsx`, `features/home-page/`. Treat as incumbent design authority for refinement; a redesign would go through `new-work` and treat this only as evidence, not as a constraint, if the user asks for one.

## Evidence on Hand

- Real product screenshots used on the home page: `public/screenshots/dashboard.jpg`, `public/screenshots/checkin.jpg` — genuine app UI, not mockups (home page copy makes this claim explicitly: "producto real, no una maqueta"). Keep it true — don't let future homepage work drift into staged/stock imagery.
- No pricing, testimonials, case studies, or customer logos exist yet. Don't fabricate any of these.

## Product Principles

1. Scope to one box, not a chain — every feature question resolves against "does the owner of one location need this to run their front desk," not against what a multi-location competitor offers.
2. Zero learning curve — "si sabés usar el teléfono, sabés usar BoxFlow." Anything that needs a manual or a systems person is out of scope.
3. The door doesn't wait — check-in is the highest-frequency interaction and must stay fast and low-attention; don't let new features slow it down.
4. One glance, one answer — the dashboard leads with a single hero number (this month's revenue) and coarse-grained, glanceable secondary data, not a dense grid of equal-weight cards.
5. Real over staged — product marketing shows the actual app, not idealized mockups; keep this true as the product evolves.

## Accessibility & Inclusion

No standard or user need established yet beyond the informal, low-friction tone described in Brand Commitments.
