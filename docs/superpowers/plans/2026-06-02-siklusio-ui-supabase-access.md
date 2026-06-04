# Siklusio UI Supabase Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the next slice of nullable Supabase access cleanup in mobile UI/hooks.

**Architecture:** Add one tested helper for flows that require both a configured Supabase client and an authenticated user id. Reuse that helper in community/avatar/profile/admin UI code while preserving existing user-facing messages and keeping data calls unchanged.

**Tech Stack:** Expo React Native, Supabase JavaScript client, TypeScript, Node test runner with `tsx`.

---

## File Structure

- Modify `mobile-app/src/lib/supabaseAccess.ts`: add `getAuthenticatedSupabaseClientStatus`.
- Modify `mobile-app/src/lib/supabaseAccess.test.ts`: add helper tests.
- Modify `mobile-app/src/hooks/useUserAvatar.ts`: replace manual nullable checks with helper.
- Modify `mobile-app/src/hooks/useCommunityFeed.ts`: centralize Supabase/user readiness checks.
- Modify `mobile-app/app/admin.tsx`: use `getSupabaseClientStatus` for admin auth/moderation.
- Modify `mobile-app/app/onboarding.tsx`: use authenticated helper before profile update.
- Modify `mobile-app/app/(tabs)/settings.tsx`: use authenticated helper before profile update.
- Modify `mobile-app/components/common/HeaderProfileButton.tsx`: use authenticated helper before profile-menu admin check.
- Modify `MERGED_AUDIT_REPORT.md`: document Phase 18 and remaining scope.

---

## Tasks

### Task 1: Authenticated Supabase Status Helper

**Files:**

- Modify: `mobile-app/src/lib/supabaseAccess.ts`
- Test: `mobile-app/src/lib/supabaseAccess.test.ts`

- [x] Add failing tests for configured-client + user-id readiness, missing user id, and custom unconfigured-client message.
- [x] Run `node --import tsx mobile-app/src/lib/supabaseAccess.test.ts` and verify the new tests fail because `getAuthenticatedSupabaseClientStatus` is not implemented.
- [x] Implement `getAuthenticatedSupabaseClientStatus(client, userId, options?)`.
- [x] Run `node --import tsx mobile-app/src/lib/supabaseAccess.test.ts` and verify all helper tests pass.

### Task 2: Adopt Helper In UI/Hooks

**Files:**

- Modify: `mobile-app/src/hooks/useUserAvatar.ts`
- Modify: `mobile-app/src/hooks/useCommunityFeed.ts`
- Modify: `mobile-app/app/admin.tsx`
- Modify: `mobile-app/app/onboarding.tsx`
- Modify: `mobile-app/app/(tabs)/settings.tsx`
- Modify: `mobile-app/components/common/HeaderProfileButton.tsx`

- [x] Replace duplicated manual nullable checks with `getSupabaseClientStatus` or `getAuthenticatedSupabaseClientStatus`.
- [x] Preserve existing behavior: avatar silently skips cloud persistence when no client/user, community mutations still throw `Anda belum login.`, and admin/moderation still uses the current configured-client messages.
- [x] Run `npm run typecheck:mobile`.

### Task 3: Report And Verification

**Files:**

- Modify: `MERGED_AUDIT_REPORT.md`

- [x] Add Phase 18 progress entry.
- [x] Update P2-10 remaining scope.
- [x] Run `npm run check`.
- [x] Run `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`.
- [x] Remove `.wrangler-dry-run` after dry-run.
- [x] Run `npx supabase db push --dry-run`.
- [x] Run scoped `git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html'`.

---

## Verification

- `node --import tsx mobile-app/src/lib/supabaseAccess.test.ts`
- `npm run typecheck:mobile`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
