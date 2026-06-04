# Siklusio Architecture Guide

Last updated: 2026-06-04.
Developer onboarding snapshot after Phase 31 backend decomposition and mobile features reorganization.

This guide explains the current shape of Siklusio and its modular structure.

## System Map

| Area | Current location | Responsibility |
| --- | --- | --- |
| Mobile/web app | `mobile-app/` | Expo Router app, native/web screens, user-facing AI flows, Supabase client access, analytics/dataLayer, local sync helpers |
| Mobile Route Layer | `mobile-app/app/` | Expo Router route files serving as wrappers / entrypoints for screens |
| Mobile Features | `mobile-app/src/features/` | Domain-specific feature implementations (calendar, community, habits, dashboard, admin) |
| Mobile Shared | `mobile-app/src/shared/` | Shared UI components (avatar picker, date field, credit chip) and global libs |
| Mobile Theme | `mobile-app/src/theme/` | Style configurations, color tokens, and theme hooks (e.g. `useColorScheme`) |
| API Worker | `backend/` | Root of Hono backend containing config and thin compatibility entrypoint |
| Backend Source | `backend/src/` | Hono app with entrypoint `backend/src/index.ts`, bootstrapped in `backend/src/app.ts`, modular controllers under `backend/src/controllers/`, routes under `backend/src/routes/`, middlewares under `backend/src/middlewares/`, and services under `backend/src/services/` |
| Backend Helpers | `backend/src/ai/`, `backend/src/payments/`, `backend/src/storage/`, `backend/src/logging/`, `backend/src/schemas/` | Domain helpers for AI prompts/schemas/credits, topup packages, avatar image validation, log redaction, request validation |
| Database | `supabase/migrations/` | Production schema source of truth for new database changes |
| Database docs/types | `docs/DATABASE.md`, `supabase/types/database.types.ts` | Human database handoff and generated remote schema snapshot |
| Landing | `landing/` | Static landing/checkout pages deployed through Cloudflare Pages/Git integration |

## Backend Folder Structure

The backend has been fully decomposed into a modular structure following the safe extraction plan. The entrypoint `backend/index.ts` now only exports the Hono application created in `backend/src/app.ts`.

```text
backend/
  index.ts             # Thin compatibility wrapper exporting createApp() from src
  wrangler.jsonc       # Worker configuration, main entrypoint pointed to backend/src/index.ts
  src/
    index.ts           # True entrypoint importing and executing createApp()
    app.ts             # Bootstraps Hono app, registers middlewares, and mounts routes
    env.ts             # Worker environment bindings type definition
    middlewares/
      auth.ts          # requireUser and requireAdmin authentication handlers
      cors.ts          # dynamic trusted-origins CORS helper
      rateLimit.ts     # wrapper around global rate limiting
      errorHandler.ts  # global exception formatting and logging
    controllers/
      admin.controller.ts            # admin operations
      ai.cycleGuide.controller.ts    # cycle guide AI generation controller
      ai.habitCoach.controller.ts    # habit coach AI generation controller
      ai.reassurance.controller.ts   # reassure AI endpoints controller
      ai.recipes.controller.ts       # daily recipes generation controller
      avatar.controller.ts           # upload avatar controller
      checkout.controller.ts         # premium register and credit topup checkout controller
      credits.controller.ts          # credit balance and ledger controller
      webhook.mayar.controller.ts    # Mayar webhook callback controller (/api/payment/webhook)
    routes/
      admin.route.ts
      ai.cycleGuide.route.ts
      ai.habitCoach.route.ts
      ai.reassurance.route.ts
      ai.recipes.route.ts
      avatar.route.ts
      checkout.route.ts
      credits.route.ts
      webhook.mayar.route.ts
    services/
      supabaseAdmin.ts # Supabase client creator and auth user list helper
      mayar.ts         # Mayar API link creation helper
      metaCapi.ts      # formatE164Phone, hashData, and sendMetaCapiEvent CAPI helper
      aiCreditLedger.ts# charge, grant, history, balance wrappers
    schemas/
      requestSchemas.ts# Zod schemas for AI request validations
    ai/                # AI prompts, summaries, logic, and policy helpers (AI credit tracking ledger)
    payments/          # payment catalogs and package descriptors
    storage/           # avatar binary validation and sanitization
    logging/           # logger output and PII scrubbing redaction
```

## Modular Backend Map

The Hono application handles modular routes and services. Under this decomposed structure:
* `backend/index.ts` redirects to `backend/src/index.ts`.
* Controllers handle HTTP request parsing, AI prompts delegation, and database orchestration.
* Routes define route mounting and middleware chaining.

## Database Boundary

New schema changes belong in `supabase/migrations/`. Root `supabase/*.sql` files are legacy/reference snippets, not the deploy path for new production changes. Read `docs/DATABASE.md` before any database work.

## Frontend Boundary

Mobile/web code should call the backend through API utilities and through direct Supabase client access.
* Route pages under `mobile-app/app/` are thin wrappers/entrypoints.
* The true screens, sub-views, and custom components live under `mobile-app/src/features/` and `mobile-app/src/shared/`.
* Direct Supabase client calls are strictly typed using the generated Types (`Database` schema imported from `supabase/types/database.types.ts`).

## Human Refactor Rule

A backend decomposition PR should be boring: same routes, same tests, smaller files. If a route move also changes payment, credit, auth, or database behavior, split it into two PRs.
