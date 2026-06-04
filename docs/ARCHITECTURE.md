# Siklusio Architecture Guide

Last updated: 2026-06-04.
Handoff snapshot after backend decomposition.

This guide explains the current shape of Siklusio and its modular structure.

## System Map

| Area | Current location | Responsibility |
| --- | --- | --- |
| Mobile/web app | `mobile-app/` | Expo Router app, native/web screens, user-facing AI flows, Supabase client access, analytics/dataLayer, local sync helpers |
| API Worker | `backend/` | Hono app with entrypoint `backend/index.ts`, app configuration `backend/app.ts`, modular routes under `backend/routes/`, middlewares under `backend/middleware/`, and services under `backend/services/` |
| Backend helpers | `backend/ai/`, `backend/payments/`, `backend/storage/`, `backend/logging/`, `backend/schemas/` | Extracted domain helpers for AI prompts/schemas/credits, topup packages, avatar image validation, log redaction, request validation |
| Database | `supabase/migrations/` | Production schema source of truth for new database changes |
| Database docs/types | `docs/DATABASE.md`, `supabase/types/database.types.ts` | Human database handoff and generated remote schema snapshot |
| Landing | `landing/` | Static landing/checkout pages deployed through Cloudflare Pages/Git integration |
| Audit docs | `MERGED_AUDIT_REPORT.md`, `docs/superpowers/plans/` | Phase history, evidence, and implementation plans |

## Backend Folder Structure

The backend has been fully decomposed into a modular structure following the safe extraction plan. The entrypoint `backend/index.ts` now only exports the Hono application created in `backend/app.ts`.

```text
backend/
  index.ts             # Entry point exporting Hono instance
  app.ts               # Bootstraps Hono app, registers middlewares, and mounts routes
  env.ts               # Worker environment bindings type definition
  middleware/
    auth.ts            # requireUser and requireAdmin authentication handlers
    cors.ts            # dynamic trusted-origins CORS helper
    rateLimit.ts       # wrapper around global rate limiting
    errorHandler.ts    # global exception formatting and logging
  routes/
    ai.recipes.ts      # GET /api/recipes/today, POST /api/generate-recipes
    ai.cycleGuide.ts   # POST /api/cycle-guide/generate, GET /api/cycle-guide/today
    ai.habitCoach.ts   # GET /api/habit-coach/current, POST /api/habit-coach/generate
    ai.reassurance.ts  # POST /api/generate-cycle-report, POST /api/generate-habits-insight, POST /api/generate-calming-reassurance
    credits.ts         # GET /api/ai/credits, GET /api/ai/credits/history
    checkout.ts        # POST /api/checkout/topup, POST /api/checkout/register, and self-serve affiliate routes
    webhook.mayar.ts   # GET/POST /api/payment/webhook (Mayar transaction hook)
    admin.ts           # GET /api/admin/users, coupon CRUD, affiliate admin CRUD, payout conversions
    avatar.ts          # POST /api/upload-avatar (R2 avatar upload)
  services/
    supabaseAdmin.ts   # Supabase client creator and auth user list helper
    mayar.ts           # Mayar API link creation helper
    metaCapi.ts        # formatE164Phone, hashData, and sendMetaCapiEvent CAPI helper
    aiCreditLedger.ts  # exports credits charge, grant, history, balance wrappers
  schemas/
    requestSchemas.ts  # exports zod schemas and validate helpers for AI request validation
  ai/                  # AI prompts, summaries, logic, and policy helpers
  payments/            # payment catalogs and package descriptors
  storage/             # avatar binary validation and sanitization
  logging/             # logger output and PII scrubbing redaction
```

## Modular Backend Map

The extracted routes and services own the following responsibilities:

| Target file | Owns |
| --- | --- |
| `backend/app.ts` | Create and configure Hono app, register middleware/routes |
| `backend/index.ts` | Export default Worker only; no route bodies |
| `backend/env.ts` | Runtime env validation and typed access |
| `middleware/auth.ts` | `requireUser`, `requireAdmin`, auth error helpers |
| `middleware/cors.ts` | Trusted origins and `ALLOWED_ORIGINS` parsing |
| `routes/recipes.ts` | Recipe saved read and paid generation |
| `routes/includedAi.ts` | Free-included AI routes with free model policy only |
| `routes/aiCredits.ts` | Balance/history reads |
| `routes/habitCoach.ts` | Habit Coach read/generate lifecycle |
| `routes/cycleGuide.ts` | Cycle Guide read/generate lifecycle |
| `routes/checkout.ts` | Premium checkout and topup checkout creation |
| `routes/webhooks.ts` | Mayar webhook, idempotency, payment success processing |
| `routes/affiliates.ts` | User affiliate profile/register/bank/conversions |
| `routes/admin.ts` | Admin users/coupons/affiliate management |
| `routes/avatars.ts` | Avatar upload policy and R2 write |
| `services/supabaseAdmin.ts` | Admin client factory and auth user listing helpers |
| `services/mayar.ts` | Mayar API request/response handling |
| `services/checkoutSessions.ts` | Checkout session insert/update cleanup helpers |
| `services/affiliateConversions.ts` | Affiliate lookup, commission, conversion insert/payout helpers |
| `services/aiCreditLedger.ts` | Thin wrapper around AI credit RPC/table operations if `backend/ai/credits.ts` grows too broad |

## Safe Extraction Order

Do not split `backend/index.ts` by moving everything at once. The safe order is:

1. Extract `getSupabaseAdmin`, `requireUser`, `requireAdmin`, and `listAllAuthUsers` into middleware/service files without changing signatures.
2. Move CORS allowlist and rate-limit registration into middleware files while keeping the same tests green.
3. Move low-coupling read routes first: health, AI credit reads, saved recipe/cycle-guide reads.
4. Move avatar upload next because it already has focused storage tests.
5. Move cost-bearing AI routes one group at a time: recipes, habit coach, cycle guide.
6. Move checkout/topup creation only after route-level tests cover cleanup failures.
7. Move Mayar webhook last because it touches registration activation, topup, affiliate conversion, and idempotency.
8. After each route group move, run `npm run check` and a Wrangler dry-run.
9. Keep API response shapes byte-compatible unless a product migration explicitly changes mobile callers.

## AI Credit Pattern

Cost-bearing AI routes must follow this order:

1. Require auth.
2. Validate request and date keys.
3. Check saved active result when the feature supports replay.
4. Check AI credit balance before calling OpenRouter.
5. Call OpenRouter with `policy: "paid"` only for paid features.
6. Validate structured AI response.
7. Save a `pending_charge` row.
8. Charge credits with a stable `reference_id`.
9. Activate saved result.
10. Return updated balance when the mobile UI needs to refresh credit state.

Free-included AI routes must use `policy: "free_included"` and must not pass a paid fallback model. If they become paid later, add persistence, UI cost labels, 402 handling, and feature matrix updates in the same phase.

## Database Boundary

New schema changes belong in `supabase/migrations/`. Root `supabase/*.sql` files are legacy/reference snippets, not the deploy path for new production changes. Read `docs/DATABASE.md` before any database work.

## Frontend Boundary

Mobile/web code should call the backend through `mobile-app/src/lib/api.ts` for Worker routes and through Supabase access helpers for direct client-safe tables/RPC. Direct `supabase.auth/from/rpc/storage` calls should not be reintroduced outside the established access helpers.

## Human Refactor Rule

A backend decomposition PR should be boring: same routes, same tests, smaller files. If a route move also changes payment, credit, auth, or database behavior, split it into two PRs.
