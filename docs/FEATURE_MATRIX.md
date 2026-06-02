# Siklusio Feature Matrix

Last audited: 2026-06-02

This document is the working source of truth for Siklusio AI feature behavior. It answers four questions for future developers:

1. Does this feature require an authenticated Supabase session?
2. Does this feature spend or grant AI credits?
3. Where is the generated result persisted?
4. Which policy decisions are still open?

## Current AI Credit Rules

Siklusio currently has two classes of AI features:

1. Cost-bearing AI features that use `ai_credit_balances`, `ai_credit_ledger`, and a saved result table.
2. Legacy/free-for-now AI features that require auth and rate limit, but do not yet debit AI credits or persist generated results.

The cost-bearing pattern is:

1. Require user auth with `requireUser(c)`.
2. Validate request shape and date keys.
3. Check balance with `getAiCreditBalance`.
4. Call OpenRouter only if balance is enough.
5. Validate structured JSON response.
6. Insert generated result with `status = "pending_charge"`.
7. Debit credits through `chargeAiCredits`.
8. Activate the saved result with `status = "active"`.

The credit ledger records:

| Field | Meaning |
| --- | --- |
| `amount` | Negative for feature usage, positive for grants/topups |
| `feature` | Product-level feature key, such as `recipes_today` |
| `reason` | Human-readable subtype, such as phase, mode, or guide level |
| `reference_id` | Saved feature row id or payment/topup id |
| `metadata` | Model, usage, generated date, or payment metadata |

## AI Feature Matrix

| Feature | Mobile entry point | Backend route | Auth | Credit policy | Persistence | Rate limit group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resep Hari Ini | `TodayRecipesModal` from Habits tab | `GET /api/recipes/today`, `POST /api/generate-recipes` | Required | 15 credits on new generation; reopening saved result costs 0 | `recipe_generations`, `status = pending_charge -> active` | `ai` for POST only | Active, documented |
| Habit Coach 7-day plan | `HabitCoachSheet` from Habits tab | `GET /api/habit-coach/current`, `POST /api/habit-coach/generate` | Required | 50 credits initial, 60 credits renewal | `habit_coach_plans`, `habit_coach_plan_days`, `status = pending_charge -> active` | `ai` for POST only | Active, documented |
| Panduan Siklus | `CycleGuideModal` from Calendar tab | `GET /api/cycle-guide/today`, `POST /api/cycle-guide/generate` | Required | 40 credits on new guide | `cycle_guides`, `status = pending_charge -> active` | `ai` for POST only | Active, documented |
| Analisis Siklus AI | `AiReportModal` | `POST /api/generate-cycle-report` | Required | 0 credits today; policy undecided | None, response lives in component state | `ai` | Legacy/free-for-now |
| Insight Habit AI | `AiRecommendationSection` | `POST /api/generate-habits-insight` | Required | 0 credits today; policy undecided | None, response lives in component state | `ai` | Legacy/free-for-now |
| TWW Reassurance | `TwwSanctuaryModal` | `POST /api/generate-calming-reassurance` | Required after Phase 1 | 0 credits today; policy undecided | None, response lives in component state | `ai` | Auth hardened, policy open |
| AI credit balance | `HeaderCreditChip`, `CreditDetailModal`, Habits tab | `GET /api/ai/credits`, `GET /api/ai/credits/history` | Required | Reads balance/history only | `ai_credit_balances`, `ai_credit_ledger` | None, GET only | Active |
| AI credit topup | `CreditDetailModal` | `POST /api/checkout/topup`, `POST /api/payment/webhook` | Checkout required; webhook token required | Server-owned package grants 300, 1000, 2500, or 6000 credits after paid webhook | `ai_credit_topups`, `ai_credit_ledger` via `process_paid_ai_credit_topup` | `checkout`, `webhook` | Active, hardened locally |

## Cost-Bearing Features

### Resep Hari Ini

Source:

- Backend route: `backend/index.ts`, `POST /api/generate-recipes`
- Saved read route: `backend/index.ts`, `GET /api/recipes/today`
- Mobile caller: `mobile-app/components/habits/TodayRecipesModal.tsx`
- Table: `supabase/migrations/20260531010402_recipe_generations.sql`

Implemented behavior:

- Cost is `15` credits.
- Existing active result for the same user/date returns without another credit charge.
- Ledger `feature` is `recipes_today`.
- Ledger `reason` is the cycle phase.
- Ledger `reference_id` is `recipe_generations.id`.
- UI shows `Buat resep - 15 kredit`.
- Saved result UI says user is not charged again.

Known follow-up:

- If credit charge fails after the `pending_charge` insert, pending rows remain hidden but there is no cleanup job yet.

### Habit Coach

Source:

- Backend route: `backend/index.ts`, `POST /api/habit-coach/generate`
- Saved read route: `backend/index.ts`, `GET /api/habit-coach/current`
- Mobile caller: `mobile-app/app/(tabs)/habits.tsx`
- Table: `supabase/migrations/20260531010200_habit_coach.sql`
- Lifecycle helper: `backend/ai/habitCoachPlanLifecycle.ts`

Implemented behavior:

- Cost is `50` credits for `initial`.
- Cost is `60` credits for `renewal`.
- Active overlapping plan returns conflict unless replacement is requested.
- The lifecycle helper archives overlapping plans before activating replacements.
- Ledger `feature` is `habit_coach`.
- Ledger `reason` is `initial` or `renewal`.
- Ledger `reference_id` is `habit_coach_plans.id`.

Known follow-up:

- Header/global credit balance can still be stale outside screens that manually update local balance.

### Panduan Siklus

Source:

- Backend route: `backend/index.ts`, `POST /api/cycle-guide/generate`
- Saved read route: `backend/index.ts`, `GET /api/cycle-guide/today`
- Mobile caller: `mobile-app/components/calendar/CycleGuideModal.tsx`
- Table: `supabase/migrations/20260531010300_cycle_guides.sql`

Implemented behavior:

- Cost is `40` credits.
- Existing active result for the same user/date is checked before generation.
- Ledger `feature` is `cycle_guide`.
- Ledger `reason` is `starter`, `active`, or `personal`.
- Ledger `reference_id` is `cycle_guides.id`.
- UI shows `Buat panduan personal - 40 kredit`.

Known follow-up:

- Add a partial unique index for active `cycle_guides(user_id, generated_for_date)` to protect against request races, mirroring `recipe_generations`.
- Cycle guide generation currently returns the new balance but mobile does not propagate it to the global header credit chip.

## Legacy AI Features With Open Policy

The following routes are authenticated and rate-limited, but they do not debit AI credits, store generated results, or expose a clear product cost label in UI.

| Feature | Route | Current behavior | Main risk | Recommended decision |
| --- | --- | --- | --- | --- |
| Analisis Siklus AI | `POST /api/generate-cycle-report` | Calls OpenRouter and returns validated JSON only | User can repeatedly generate paid-fallback AI output with no ledger trail | Either make it paid and persisted, or document it as free with stricter quota |
| Insight Habit AI | `POST /api/generate-habits-insight` | Calls OpenRouter and returns validated JSON only | Cost policy differs from Habit Coach even though both analyze habits | Merge into Habit Coach, or set a small explicit cost |
| TWW Reassurance | `POST /api/generate-calming-reassurance` | Requires auth after Phase 1 and returns validated JSON only | Sensitive journal text goes to model without saved consent/audit policy | Keep free with low quota, or charge and persist only minimal metadata |

Recommended default for long-term development:

1. Any AI feature that can trigger paid OpenRouter fallback should have an explicit product policy.
2. If the feature is paid, it should use `chargeAiCredits` and a saved result table.
3. If the feature is free, it should have a documented quota and UI copy saying it is included/free.
4. Do not silently add new OpenRouter calls without adding the feature to this matrix.

## Topup Packages

The server-owned catalog is in `backend/payments/topupPackages.ts`.

| Package id | Display name | Credits | Price |
| --- | --- | --- | --- |
| `coba_dulu` | Coba Dulu | 300 | Rp9.900 |
| `teman_mingguan` | Teman Mingguan | 1000 | Rp24.900 |
| `sahabat_siklus` | Sahabat Siklus | 2500 | Rp49.000 |
| `bekal_tenang` | Bekal Tenang | 6000 | Rp99.000 |

Current hardened behavior:

- Mobile sends only `packageId`.
- Backend resolves price and credits from server catalog.
- Mayar webhook calls `process_paid_ai_credit_topup`.
- RPC atomically claims pending topup, grants credits, and marks topup paid.
- Ledger `feature` is `topup`.
- Ledger `reason` is `Mayar Top-up <amount> Kredit`.
- Ledger `reference_id` is `ai_credit_topups.id`.

## Rate Limit Policy

Implemented in `backend/rateLimit.ts`.

| Group | Routes | Default |
| --- | --- | --- |
| `ai` | `POST /api/generate-recipes`, `POST /api/generate-cycle-report`, `POST /api/generate-habits-insight`, `POST /api/generate-calming-reassurance`, `POST /api/habit-coach/generate`, `POST /api/cycle-guide/generate` | 20 requests / 60 seconds |
| `checkout` | `POST /api/checkout/register`, `POST /api/checkout/topup` | 10 requests / 300 seconds |
| `webhook` | `POST /api/payment/webhook` | 120 requests / 60 seconds |

Environment overrides:

- `AI_RATE_LIMIT_MAX`
- `AI_RATE_LIMIT_WINDOW_SECONDS`
- `CHECKOUT_RATE_LIMIT_MAX`
- `CHECKOUT_RATE_LIMIT_WINDOW_SECONDS`
- `WEBHOOK_RATE_LIMIT_MAX`
- `WEBHOOK_RATE_LIMIT_WINDOW_SECONDS`

Limitation:

- Current limiter is in-memory per Worker isolate. Use Cloudflare WAF Rate Limiting Rules, Durable Objects, or KV-backed counters for global production enforcement.

## Checklist For Adding A New AI Feature

Before adding any new OpenRouter call:

1. Add the feature row to this matrix.
2. Decide `paid`, `free`, or `included quota`.
3. If paid, define exact credit cost and ledger `feature` key.
4. If paid, create a saved result table with `pending_charge` and `active`.
5. If paid, persist validated response before charging.
6. If paid, charge with `chargeAiCredits` after validation and save.
7. If free, document quota and rate limit.
8. Add UI copy that tells the user whether credits are used.
9. Add backend tests for 401, 402 if paid, and no double-charge on saved result.
10. Add mobile handling for 402 and balance refresh.
11. Update this document and `MERGED_AUDIT_REPORT.md`.

## Open Decisions

These decisions should be made before a human team expands Siklusio AI further:

1. Should `generate-cycle-report` cost credits, and should reports be saved by date?
2. Should `generate-habits-insight` be retired in favor of Habit Coach, or priced separately?
3. Should TWW reassurance be free but quota-limited because it is emotionally sensitive, or paid because it can trigger paid model fallback?
4. Should all saved AI result tables use partial unique indexes for active user/date rows?
5. Should all AI feature success responses publish a shared balance invalidation event so `HeaderCreditChip` stays fresh?
6. Should OpenRouter paid fallback be disabled for free-for-now features until product pricing is finalized?
