# Siklusio Today Key Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep mobile daily features aligned with the real local day when the app stays open across midnight or returns to foreground.

**Architecture:** Add a small pure date helper for local date keys and next-midnight scheduling, then expose a React Native hook that refreshes on the next local day and on `AppState` active events. Use the hook in daily dashboard, habits, calendar guide payload, and dashboard action card.

**Tech Stack:** Expo React Native, TypeScript, Node test runner with `tsx`, date-fns for existing local date parsing/formatting style.

---

## File Structure

- Create `mobile-app/src/lib/todayKey.ts`: pure helpers `getLocalDateKey` and `getMsUntilNextLocalDay`.
- Create `mobile-app/src/lib/todayKey.test.ts`: unit tests for local date formatting and next-midnight delay.
- Create `mobile-app/src/hooks/useTodayKey.ts`: hook that updates today key at midnight and on app focus.
- Modify `mobile-app/app/(tabs)/dashboard.tsx`: use dynamic today key/date.
- Modify `mobile-app/app/(tabs)/habits.tsx`: use dynamic today key/date for selected day, coach plan fetch, recipes, and plan generation.
- Modify `mobile-app/app/(tabs)/calendar.tsx`: use dynamic today key for cycle guide generated date.
- Modify `mobile-app/components/dashboard/ActionCard.tsx`: use dynamic today key for completion progress.
- Modify `MERGED_AUDIT_REPORT.md`: mark P2-5 as locally remediated.

---

## Expected Behavior

- A mounted screen updates `todayKey` shortly after local midnight.
- Returning from background refreshes `todayKey` immediately.
- Dashboard date header, phase, completion, habits plan date, and recipe generated date move to the new day without requiring app restart.

---

## Verification

- `node --import tsx mobile-app/src/lib/todayKey.test.ts`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
