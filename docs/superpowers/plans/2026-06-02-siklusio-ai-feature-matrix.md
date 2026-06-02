# Siklusio AI Feature Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document every Siklusio AI endpoint, mobile entry point, credit cost, persistence behavior, and open policy decision so future developers can safely extend AI features.

**Architecture:** Keep this phase docs-only. Use the current backend route handlers, AI credit helpers, rate limiter, Supabase migrations, and mobile API calls as source evidence, then write a single feature matrix that separates implemented behavior from unresolved product policy.

**Tech Stack:** Hono on Cloudflare Workers, OpenRouter, Supabase Auth/DB/RPC, Expo React Native, TypeScript, Markdown documentation.

---

## File Structure

- Create `docs/FEATURE_MATRIX.md`: source-of-truth matrix for AI features, credit policy, persistence, rate limit groups, and known gaps.
- Modify `MERGED_AUDIT_REPORT.md`: mark P2-3 as locally documented and keep legacy AI credit policy as follow-up.

---

## Evidence Sources

- Backend routes: `backend/index.ts`
- Credit helpers: `backend/ai/credits.ts`, `backend/ai/history.ts`
- Rate limiter: `backend/rateLimit.ts`
- Topup package catalog: `backend/payments/topupPackages.ts`
- Supabase AI tables/RPCs: `supabase/migrations/20260531010100_ai_credits.sql`, `20260531010200_habit_coach.sql`, `20260531010300_cycle_guides.sql`, `20260531010402_recipe_generations.sql`, `20260531112800_ai_credit_topups.sql`, `20260601101749_atomic_ai_credit_topup_processing.sql`
- Mobile API callers: `mobile-app/components/**`, `mobile-app/app/(tabs)/habits.tsx`, `mobile-app/src/lib/api.ts`

---

## Tasks

### Task 1: Map AI Route Behavior

**Files:**
- Read: `backend/index.ts`
- Read: `backend/rateLimit.ts`
- Read: `backend/ai/credits.ts`

- [x] Identify every OpenRouter route.
- [x] Identify auth requirement for each route.
- [x] Identify whether the route checks AI credit balance.
- [x] Identify whether the route writes to persistence tables.
- [x] Identify ledger `feature`, `reason`, and `reference_id` behavior where present.

### Task 2: Map Mobile Entry Points

**Files:**
- Read: `mobile-app/components/habits/TodayRecipesModal.tsx`
- Read: `mobile-app/app/(tabs)/habits.tsx`
- Read: `mobile-app/components/calendar/CycleGuideModal.tsx`
- Read: `mobile-app/components/calendar/AiReportModal.tsx`
- Read: `mobile-app/components/habits/AiRecommendationSection.tsx`
- Read: `mobile-app/components/dashboard/TwwSanctuaryModal.tsx`
- Read: `mobile-app/components/common/CreditDetailModal.tsx`

- [x] Link each feature to its UI caller.
- [x] Note where UI shows credit cost.
- [x] Note where UI does not show cost because policy is still unclear.

### Task 3: Write the Feature Matrix

**Files:**
- Create: `docs/FEATURE_MATRIX.md`

- [x] Document implemented cost-bearing AI features.
- [x] Document legacy/free-for-now AI features.
- [x] Document credit balance/topup routes.
- [x] Add checklist for adding future AI features.
- [x] Add policy decisions still needed before long-term development.

### Task 4: Update Audit Report

**Files:**
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] Add Phase 14 progress entry.
- [x] Update P2-3 status.
- [x] Update local/uncommitted remediation scope from Phase 1-13 to Phase 1-14.

---

## Verification

- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
