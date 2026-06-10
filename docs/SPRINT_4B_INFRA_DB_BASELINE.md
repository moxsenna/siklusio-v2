# Sprint 4B — Infra / Database Baseline Audit

Last updated: 2026-06-10  
Status: **COMPLETE** (read-only audit; no schema or app behavior changes)

## Goal

Establish a documented, repo-verifiable baseline for Supabase migrations, RLS posture, and generated types after Sprint 3 mobile closure and Sprint 4A CI guardrails — without mutating production schema or application behavior.

## Scope delivered

| Item | Outcome |
|------|---------|
| Migration inventory | 22 files documented; lexicographic order verified; local = remote (22/22) |
| Legacy root SQL allowlist | 23 files; enforced by `backend/infraGuardrails.test.ts` + `scripts/sprint4b-db-baseline-check.mjs` |
| RLS baseline checklist | Documented below with migration evidence |
| Generated types status | `supabase/types/database.types.ts` present; sensitive tables present |
| Read-only baseline script | `npm run db:baseline-check` |
| Docs | This file; light updates to `DATABASE.md`, `supabase/README.md`, `SECURITY.md` §7 |

## Migration inventory (22 files)

Canonical path: `supabase/migrations/`. All filenames are unique and lexicographically ordered.

| # | Migration | Theme |
|---|-----------|-------|
| 1 | `20260531010100_ai_credits.sql` | AI credit balances + ledger RLS (`service_role` write) |
| 2 | `20260531010200_habit_coach.sql` | Habit coach plans |
| 3 | `20260531010300_cycle_guides.sql` | Cycle guides |
| 4 | `20260531010401_cycle_guides_unique.sql` | Cycle guides uniqueness |
| 5 | `20260531010402_recipe_generations.sql` | Recipe generations |
| 6 | `20260531112800_ai_credit_topups.sql` | Topups table; user `SELECT` own rows |
| 7 | `20260601094508_onboarding_completion_flag.sql` | `profiles.onboarding_completed` |
| 8 | `20260601100443_pending_registration_auth_user_id.sql` | `pending_registrations.user_id` |
| 9 | `20260601101749_atomic_ai_credit_topup_processing.sql` | Atomic topup RPC |
| 10 | `20260602164929_checkout_affiliate_support_tables.sql` | Affiliates, checkout_sessions, conversions RLS |
| 11 | `20260602174912_phase28_rls_function_grants.sql` | Function grant hardening (Phase 28) |
| 12 | `20260604094057_rate_limit_db.sql` | Rate limit table |
| 13 | `20260604100412_rate_limit_row_lock.sql` | Rate limit row lock |
| 14 | `20260604104737_rate_limit_atomic_lock.sql` | Rate limit advisory lock |
| 15 | `20260605134100_admin_crm.sql` | Admin CRM tables + admin-only RLS |
| 16 | `20260605154500_meta_capi_attribution.sql` | Meta CAPI attribution columns |
| 17 | `20260606120000_admin_crm_fix_pipeline.sql` | CRM pipeline fix |
| 18 | `20260606130000_whatsapp_autoresponder.sql` | WhatsApp settings/logs RLS |
| 19 | `20260608120000_community_privacy_hardening.sql` | Column-level grants on community tables |
| 20 | `20260608123000_revoke_anon_community_user_id_select.sql` | Revoke `user_id` from `anon` |
| 21 | `20260608124500_regrant_anon_community_safe_columns.sql` | Re-grant safe columns to `anon` |
| 22 | `20260608130000_ai_daily_generation_cache.sql` | Daily AI cache RLS |

### Migration hygiene (2026-06-10)

- **Duplicates / out-of-order:** None detected in repo.
- **Root SQL outside allowlist:** None (23 legacy files on allowlist).
- **`supabase/.temp` tracked:** Not tracked (gitignored + CI test).
- **Secrets in SQL/docs:** No JWT/API-key literals found; only policy names referencing `service_role`.

### Remote parity

As of 2026-06-10, `npm run db:migrations:list --linked` reports **22 local = 22 remote**. Earlier docs (Phase 27 era) mentioned “3 pending migrations”; that is **stale** and corrected in `supabase/README.md`.

## RLS baseline checklist

Evidence combines canonical migrations plus legacy reference SQL (`supabase/*.sql`) where base policies predate structured migrations.

| Table / area | RLS enabled | Baseline posture | Primary evidence |
|--------------|-------------|------------------|------------------|
| `community_posts` | Yes | Authenticated read/write via policies; column grants hide `user_id`; `anon` limited to safe columns; `service_role` full SELECT | Legacy `community.sql`; `20260608120000`–`20260608124500` |
| `community_comments` | Yes | Same pattern as posts | Legacy `community.sql`; privacy migrations |
| `profiles` | Yes | User CRUD own row (`auth.uid() = id`) | Legacy `schema.sql`; `20260601094508` (column only) |
| `affiliates` | Yes | `service_role` full access; no client write | `20260602164929` |
| `affiliate_conversions` | Yes | `service_role` full access | `20260602164929` |
| `checkout_sessions` | Yes | `service_role` full access | `20260602164929` + legacy `checkout_sessions.sql` |
| `pending_registrations` | Yes | `service_role` full access | Legacy `pending_registrations.sql`; alters in `20260601100443`, `20260602164929` |
| `ai_credit_balances` | Yes | User read via RPC path; `service_role` mutates | `20260531010100` |
| `ai_credit_ledger` | Yes | `service_role` write; user read own | `20260531010100` |
| `ai_credit_topups` | Yes | User `SELECT` own; webhook via `service_role` | `20260531112800`, `20260601101749` |
| `ai_daily_generation_cache` | Yes | User `SELECT` own; `service_role` write | `20260608130000` |
| `admin_crm_*` (4 tables) | Yes | Admin-only via `profiles.is_admin` | `20260605134100` |
| `whatsapp_autoresponder_settings` | Yes | Admin read/write (`is_admin`) | `20260606130000` |
| `whatsapp_autoresponder_logs` | Yes | Admin read; `service_role` write | `20260606130000` |

### Function grants (Phase 28)

`20260602174912_phase28_rls_function_grants.sql` revokes sensitive RPCs from `PUBLIC`/`anon`/`authenticated` where appropriate and grants `service_role` / `authenticated` per function. Covered by `scripts/database-docs.test.js`.

## Generated types status

| Field | Value |
|-------|-------|
| File | `supabase/types/database.types.ts` (~1685 lines) |
| Postgrest version in types | `14.5` |
| Sensitive tables in types | All Sprint 4B checklist tables present |
| Last regeneration in sprint | **Not run** (no `SUPABASE_PROJECT_REF` required for repo baseline) |

### Regenerate types (manual; needs credentials)

```powershell
$env:SUPABASE_PROJECT_REF = "<project-ref>"
npm run db:types
```

Writes `supabase/types/database.types.ts` via `scripts/generate-supabase-types.mjs`. Run after applying new migrations to the linked remote project, then commit the regenerated file.

**Blocker if env missing:** Regeneration requires `SUPABASE_PROJECT_REF` and Supabase CLI auth. Repo baseline only verifies the committed types file contains expected tables — it does not prove byte-for-byte sync with live remote schema.

## Manual commands

### Repo-local (no production secrets)

```powershell
npm run db:baseline-check
npm run check
```

### Requires linked Supabase project + access token

```powershell
npm run db:migrations:list
npm run db:push:dry-run
npm run db:lint
npm run db:types
```

## Automated guardrails (Sprint 4A + 4B)

| Check | Location |
|-------|----------|
| `.temp` not tracked, `.env.example` placeholders, legacy SQL allowlist | `backend/infraGuardrails.test.ts` |
| DATABASE.md, types file, Phase 28 migration patterns | `scripts/database-docs.test.js` |
| Sprint 4B baseline (migrations, types tables, secrets scan) | `scripts/sprint4b-db-baseline-check.mjs` |
| Secret leak scan | gitleaks in CI |

## Known deferred items

| Item | Reason |
|------|--------|
| Regenerate types from live remote | Needs `SUPABASE_PROJECT_REF` + CLI login |
| `db:push:dry-run` / `db:lint` in CI | Requires production-linked credentials |
| Automated RLS integration tests (pgTAP / token-based) | Long-term cleanup per `DATABASE.md` §8 |
| Squash legacy root SQL into single baseline reference | Long-term cleanup |
| Native mobile manual QA | Deferred from Sprint 3 (PARTIAL web smoke only) |
| Split `CycleContext` provider | Explicitly out of scope |

## Risk notes

1. **Legacy vs migrations:** Base RLS for `profiles`, `community_*`, and `pending_registrations` lives in legacy root SQL. New changes must go through `supabase/migrations/`; legacy files are reference only.
2. **Types drift:** Without periodic `npm run db:types`, TypeScript types may lag remote schema after new migrations.
3. **Community privacy:** Sprint 1 hardening depends on column grants + migrations `20260608120000`–`20260608124500`; do not revert without security review.
4. **No production mutation in 4B:** This sprint documents baseline only; any RLS or schema fix requires a dedicated sprint with diagnosis.

## Test results (closure)

| Command | Result |
|---------|--------|
| `npm run db:baseline-check` | PASS |
| `npm run check` | PASS (at commit time) |
| CI | PASS (at push time) |

## Blockers before next sprint

**None** identified from this audit. Proceed with planned refactors/features once any optional manual items (`db:lint`, types regen) are scheduled outside the critical path.

## Do not reopen Sprint 4B unless

- New migrations land without updating inventory docs / baseline script
- Legacy SQL allowlist drifts from `infraGuardrails.test.ts`
- A production DB incident requires documented RLS/schema remediation