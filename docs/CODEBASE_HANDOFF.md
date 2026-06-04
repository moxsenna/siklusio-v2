# Siklusio Codebase Handoff

Last updated: 2026-06-03.
Phase 31 handoff snapshot.

This guide is for the next human developer who opens Siklusio after this audit cycle. The goal is to reduce orientation cost: what to read first, how names are chosen, which language to use, and which files should not be touched casually.

## Start Here

Read these files in order:

1. `MERGED_AUDIT_REPORT.md` for the full audit history and remaining optional lanes.
2. `docs/RUNBOOK.md` before any deploy or migration.
3. `docs/ARCHITECTURE.md` before refactoring backend structure.
4. `docs/DATABASE.md` before changing Supabase schema or RPC grants.
5. `docs/FEATURE_MATRIX.md` before adding or repricing AI features.
6. `docs/AVATAR_POLICY.md` before changing avatar upload/moderation.

## Language Rules

Use Bahasa Indonesia for user-facing copy, product docs aimed at the Siklusio team, error messages shown to users, and release/audit explanations.

Use English for code identifiers when they describe generic programming concepts or backend infrastructure, for example `requireUser`, `checkoutSessions`, `rateLimit`, `buildAiFallbackCopy`.

Use product-specific Indonesian terms only when they are part of the domain and easier for humans to recognize, for example `Resep Hari Ini`, `Panduan Siklus`, `TWW Sanctuary`, and copy shown in the UI.

Avoid mixing vague names such as `data`, `thing`, `temp`, `fix2`, or `newFlow` into long-lived files. If a name explains a product behavior, prefer the product behavior over the implementation detail.

## Naming Conventions

| Layer                          | Convention                            | Example                                          |
| ------------------------------ | ------------------------------------- | ------------------------------------------------ |
| TypeScript variables/functions | `camelCase`                           | `buildCycleGuideSnapshot`                        |
| React components               | `PascalCase`                          | `AiFallbackNotice`                               |
| Types/interfaces               | `PascalCase`                          | `AiFallbackInput`                                |
| API routes                     | kebab-case path segments              | `/api/cycle-guide/generate`                      |
| Database tables/columns        | `snake_case`                          | `ai_credit_balances`, `generated_for_date`       |
| Supabase migrations            | CLI timestamp plus descriptive slug   | `20260602174912_phase28_rls_function_grants.sql` |
| Tests                          | colocated or same domain name         | `backend/ai/modelPolicy.test.ts`                 |
| Docs                           | uppercase topic for core handoff docs | `docs/RUNBOOK.md`                                |

## What Not To Touch Casually

These files/folders had explicit user direction or parallel workspace state during the audit:

1. `graphify-out/` is important and must not be deleted, regenerated, moved, or ignored without explicit approval.
2. `fitur.md` has parallel state and should not be staged as part of this release audit.
3. `my-video/` is outside release scope.
4. Revised landing files and `.bak` landing files are outside release scope unless the task is specifically landing redesign/recovery.
5. Dirty state in the main workspace should not be cleaned from the release worktree.

## How To Add A New AI Feature

1. Add the feature to `docs/FEATURE_MATRIX.md` before coding.
2. Decide if it is paid, free-included, or included quota.
3. If paid, define credit cost, saved result table, ledger `feature`, ledger `reason`, and `reference_id` behavior.
4. Add backend tests for auth, validation, insufficient credit, and idempotency/replay if saved results exist.
5. Add mobile UI copy that clearly says whether credits are used.
6. Add `AiFallbackNotice` or equivalent local fallback UI for 402/network/rate-limit errors.
7. Use `resolveOpenRouterModels({ policy: "paid" })` only when credits/persistence are wired.
8. Use `resolveOpenRouterModels({ policy: "free_included" })` when the feature is not meant to spend paid OpenRouter fallback.
9. Run `npm run check` and update docs in the same PR.

## How To Add A Database Change

1. Read `docs/DATABASE.md`.
2. Create a migration with `supabase migration new <descriptive_name>`.
3. Do not edit generated types manually.
4. Run `npm run db:push:dry-run` before apply.
5. Apply with `npx supabase db push` only in the intended release window.
6. Regenerate types with `npm run db:types` after apply.
7. Update `docs/DATABASE.md` if the table/RPC inventory changes.

## How To Refactor Backend Safely

1. Read `docs/ARCHITECTURE.md`.
2. Move one route group at a time.
3. Keep function signatures stable while moving code.
4. Add focused tests before changing behavior.
5. Do not combine route movement with payment/auth/credit behavior changes.
6. Run `npm run check` and Wrangler dry-run after each group.
7. Leave breadcrumbs in the PR description so another human can review the move mechanically.

## Human Review Checklist

Before merging future work, ask:

1. Can a new developer find the feature in docs?
2. Does the code name describe product behavior, not a temporary implementation?
3. Does user-facing Bahasa Indonesia sound clear and calm?
4. Are payment/auth/AI-credit changes covered by tests or smoke evidence?
5. Are Supabase migrations the only source of new schema truth?
6. Are ignored/excluded audit folders still untouched?
7. Does the final report say what was not verified?

## Remaining Optional Lanes

After Phase 31, the main audit remediation cycle is closed. The sensible future lanes are:

1. Backend decomposition into `routes/`, `middleware/`, and `services/` using the safe extraction order.
2. Supabase baseline/squash plan for legacy root SQL snippets.
3. Typed Supabase client adoption after generated types and production schema stay aligned.
4. Expo SDK 56 upgrade lane to address residual mobile npm audit warnings without `npm audit fix --force` surprises.
5. Stronger global rate limiting through Cloudflare WAF, Durable Objects, or KV-backed counters.
6. More complete RLS integration tests with real authenticated non-admin/admin users.

## Handoff Summary

Siklusio is now much safer than at the start of the audit, but it is still a real product codebase with payment, health-adjacent data, AI cost, and deployment coupling. Treat small changes with respect. Prefer small, documented, verified phases over dramatic rewrites. Future humans should feel the structure is learnable, not magical.
