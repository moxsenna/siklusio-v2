# Siklusio Savings Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync Siklusio savings tracker values (`target_saving`, `current_saving`) between local mobile state and Supabase profiles so savings progress survives device/session changes.

**Architecture:** Add a small pure savings sync helper for normalization and timestamp conflict checks, then use it from `SyncManager.syncSavingsData`. Wire `CycleContext` to run one initial savings sync per logged-in user and debounce later savings changes, without coupling savings updates to HPHT/cycle sync.

**Tech Stack:** Expo React Native, Supabase client, TypeScript, local storage wrapper, Node test runner with `tsx`.

---

## File Structure

- Create `mobile-app/src/lib/savingsSync.ts`: pure helper for cloud/local savings normalization, update payloads, and timestamp conflict decisions.
- Create `mobile-app/src/lib/savingsSync.test.ts`: regression tests for zero-value pulls and update payloads.
- Modify `mobile-app/src/lib/SyncManager.ts`: add `syncSavingsData` using the helper and `hs_v3_savings_sync_time`.
- Modify `mobile-app/src/context/CycleContext.tsx`: initial savings sync, debounced savings push/pull, and falsey-safe cloud load.
- Modify `MERGED_AUDIT_REPORT.md`: mark P2-1 as locally remediated and note remaining limitations.

---

## Tasks

### Task 1: Savings Sync Helper

**Files:**

- Create: `mobile-app/src/lib/savingsSync.ts`
- Test: `mobile-app/src/lib/savingsSync.test.ts`

- [x] Write failing test for mapping cloud zero values.
- [x] Write failing test for building update payloads with explicit numbers.
- [x] Implement minimal helper.
- [x] Run helper test until it passes.

### Task 2: SyncManager Savings Method

**Files:**

- Modify: `mobile-app/src/lib/SyncManager.ts`

- [x] Add `SavingsSyncPayload` and `SavingsSyncResult`.
- [x] Select `target_saving,current_saving,updated_at` from `profiles`.
- [x] Pull cloud savings when `updated_at` is newer than `hs_v3_savings_sync_time`.
- [x] Push local savings with explicit `updated_at` otherwise.
- [x] Store pulled/pushed sync time after successful sync.

### Task 3: CycleContext Wiring

**Files:**

- Modify: `mobile-app/src/context/CycleContext.tsx`

- [x] Load `target_saving = 0` and `current_saving = 0` from cloud instead of ignoring falsey values.
- [x] Add initial savings sync per authenticated user.
- [x] Add debounced savings sync after local savings changes.
- [x] Avoid re-upload loops while applying pulled savings state.

### Task 4: Report And Verification

**Files:**

- Modify: `MERGED_AUDIT_REPORT.md`

- [x] Add Phase 15 progress entry.
- [x] Mark P2-1 savings tracker sync as locally remediated.
- [x] Run full verification suite.

---

## Verification

- `node --import tsx mobile-app/src/lib/savingsSync.test.ts`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
