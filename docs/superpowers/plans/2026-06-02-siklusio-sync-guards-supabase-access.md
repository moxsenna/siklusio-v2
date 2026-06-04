# Siklusio Sync Guards And Supabase Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce login-time sync races and make nullable Supabase access explicit for sync code.

**Architecture:** Add pure helper modules for sync readiness and Supabase client status, then use them in `SyncManager` and `CycleContext`. Keep the change incremental: do not refactor every UI component yet, but establish the pattern in the most data-critical sync path.

**Tech Stack:** Expo React Native, Supabase client, TypeScript, Node test runner with `tsx`.

---

## File Structure

- Create `mobile-app/src/lib/supabaseAccess.ts`: pure helpers that convert nullable Supabase client values into explicit `ready` or `unconfigured` status.
- Create `mobile-app/src/lib/supabaseAccess.test.ts`: tests for ready/unconfigured status and error messages.
- Create `mobile-app/src/lib/syncGuards.ts`: pure sync readiness predicate for profile data sync.
- Create `mobile-app/src/lib/syncGuards.test.ts`: tests that profile sync waits for auth user, cloud profile load, and valid cycle settings.
- Modify `mobile-app/src/lib/SyncManager.ts`: use the Supabase access helper instead of repeated raw nullable checks.
- Modify `mobile-app/src/context/CycleContext.tsx`: use sync guard so profile push does not run while profile loading is still resolving.
- Modify `MERGED_AUDIT_REPORT.md`: mark P2-10 as partially remediated and document remaining nullable-client cleanup.

---

## Tasks

### Task 1: Supabase Access Helper

**Files:**

- Create: `mobile-app/src/lib/supabaseAccess.ts`
- Test: `mobile-app/src/lib/supabaseAccess.test.ts`

- [x] Write failing tests for unconfigured nullable client status.
- [x] Write failing tests for ready client status.
- [x] Implement helper.
- [x] Run focused tests.

### Task 2: Sync Readiness Guard

**Files:**

- Create: `mobile-app/src/lib/syncGuards.ts`
- Test: `mobile-app/src/lib/syncGuards.test.ts`

- [x] Write failing tests proving profile sync waits while cloud profile is loading.
- [x] Implement guard.
- [x] Run focused tests.

### Task 3: Wire Critical Sync Code

**Files:**

- Modify: `mobile-app/src/lib/SyncManager.ts`
- Modify: `mobile-app/src/context/CycleContext.tsx`

- [x] Replace repeated `if (!supabase)` branches in `SyncManager` with `getSupabaseClientStatus`.
- [x] Gate cycle profile auto-sync with `canSyncCycleProfile`.
- [x] Keep existing behavior for activity/savings sync after initial sync.

### Task 4: Report And Verification

**Files:**

- Modify: `MERGED_AUDIT_REPORT.md`

- [x] Add Phase 16 progress entry.
- [x] Update P2-10 with local remediation and remaining scope.
- [x] Run full verification suite.

---

## Verification

- `node --import tsx mobile-app/src/lib/supabaseAccess.test.ts`
- `node --import tsx mobile-app/src/lib/syncGuards.test.ts`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
