# Siklusio Auth And API Supabase Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the explicit nullable Supabase access pattern from sync code into auth and API helper code.

**Architecture:** Add a tested access-token helper to `supabaseAccess.ts`, then reuse `getSupabaseClientStatus` in `AuthContext`, `api.ts`, `auth.tsx`, and `payment-pending.tsx`. Keep runtime behavior equivalent while removing duplicated raw nullable Supabase checks.

**Tech Stack:** Expo React Native, Supabase JavaScript client, TypeScript, Node test runner with `tsx`.

---

## File Structure

- Modify `mobile-app/src/lib/supabaseAccess.ts`: add `getSupabaseAccessToken`.
- Modify `mobile-app/src/lib/supabaseAccess.test.ts`: token helper tests.
- Modify `mobile-app/src/lib/api.ts`: use token helper.
- Modify `mobile-app/src/context/AuthContext.tsx`: use `getSupabaseClientStatus`.
- Modify `mobile-app/app/auth.tsx`: use `getSupabaseClientStatus`.
- Modify `mobile-app/app/payment-pending.tsx`: use `getSupabaseClientStatus`.
- Modify `MERGED_AUDIT_REPORT.md`: document Phase 17 and remaining UI scope.

---

## Tasks

### Task 1: Token Helper

**Files:**

- Modify: `mobile-app/src/lib/supabaseAccess.ts`
- Test: `mobile-app/src/lib/supabaseAccess.test.ts`

- [x] Write failing tests for token extraction and nullable client behavior.
- [x] Implement `getSupabaseAccessToken`.
- [x] Run focused test.

### Task 2: Adopt Helper In Auth/API

**Files:**

- Modify: `mobile-app/src/lib/api.ts`
- Modify: `mobile-app/src/context/AuthContext.tsx`
- Modify: `mobile-app/app/auth.tsx`
- Modify: `mobile-app/app/payment-pending.tsx`

- [x] Replace duplicated raw nullable checks with `getSupabaseClientStatus` or `getSupabaseAccessToken`.
- [x] Keep existing user-facing messages.
- [x] Run mobile typecheck.

### Task 3: Report And Verification

**Files:**

- Modify: `MERGED_AUDIT_REPORT.md`

- [x] Add Phase 17 progress entry.
- [x] Update P2-10 remaining scope.
- [x] Run full verification suite.

---

## Verification

- `node --import tsx mobile-app/src/lib/supabaseAccess.test.ts`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
