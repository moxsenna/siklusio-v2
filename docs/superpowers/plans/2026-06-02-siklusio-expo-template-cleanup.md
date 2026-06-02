# Siklusio Expo Template Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unused Expo starter template route/components from the mobile app so humans do not waste time learning dead code.

**Architecture:** Refactor the not-found route away from template `Themed` components, remove the placeholder `/modal` stack route, then delete the orphaned Expo starter components and their obsolete snapshot-style test dependency. Keep real product modal components untouched.

**Tech Stack:** Expo Router, React Native, TypeScript, npm lockfile.

---

## File Structure

- Modify `mobile-app/app/+not-found.tsx`: use React Native `Text`/`View` directly.
- Modify `mobile-app/app/_layout.tsx`: remove template `/modal` stack registration and stale comment.
- Delete `mobile-app/app/modal.tsx`: unused Expo starter placeholder route.
- Delete `mobile-app/components/EditScreenInfo.tsx`: only used by placeholder route.
- Delete `mobile-app/components/StyledText.tsx`: only used by `EditScreenInfo` and obsolete test.
- Delete `mobile-app/components/Themed.tsx`: only used by `+not-found` and template chain before refactor.
- Delete `mobile-app/components/ExternalLink.tsx`: only used by `EditScreenInfo`.
- Delete `mobile-app/components/useClientOnlyValue.ts` and `.web.ts`: no active imports.
- Delete `mobile-app/components/__tests__/StyledText-test.js`: obsolete template test.
- Modify `mobile-app/package.json` and `mobile-app/package-lock.json`: remove `react-test-renderer` after deleting its only test.
- Modify `MERGED_AUDIT_REPORT.md`: document Phase 19 and remaining cleanup candidates.

---

## Tasks

### Task 1: Refactor Not Found And Remove Modal Route

**Files:**
- Modify: `mobile-app/app/+not-found.tsx`
- Modify: `mobile-app/app/_layout.tsx`

- [x] Replace `@/components/Themed` import with React Native `Text` and `View`.
- [x] Give the not-found screen an explicit background/text color so behavior remains stable.
- [x] Remove stale `/modal` comment and `<Stack.Screen name="modal" ... />`.

### Task 2: Delete Expo Template Orphans

**Files:**
- Delete: `mobile-app/app/modal.tsx`
- Delete: `mobile-app/components/EditScreenInfo.tsx`
- Delete: `mobile-app/components/StyledText.tsx`
- Delete: `mobile-app/components/Themed.tsx`
- Delete: `mobile-app/components/ExternalLink.tsx`
- Delete: `mobile-app/components/useClientOnlyValue.ts`
- Delete: `mobile-app/components/useClientOnlyValue.web.ts`
- Delete: `mobile-app/components/__tests__/StyledText-test.js`

- [x] Delete all orphaned Expo starter files.
- [x] Verify `rg -n 'Themed|EditScreenInfo|StyledText|ExternalLink|useClientOnlyValue' mobile-app --glob '!node_modules/**' --glob '!dist/**' --glob '!graphify-out/**'` has no active source references.

### Task 3: Remove Obsolete Dependency

**Files:**
- Modify: `mobile-app/package.json`
- Modify: `mobile-app/package-lock.json`

- [x] Remove `react-test-renderer` from `mobile-app` because the only template test using it is deleted.
- [x] Run `npm run typecheck:mobile`.

### Task 4: Report And Verification

**Files:**
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] Add Phase 19 progress entry.
- [x] Update P3-3 status and keep remaining cleanup candidates separate.
- [x] Run `npm run check`.
- [x] Run `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`.
- [x] Remove `.wrangler-dry-run` after dry-run.
- [x] Run `npx supabase db push --dry-run`.
- [x] Run scoped `git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html'`.

---

## Verification

- `npm run typecheck:mobile`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
