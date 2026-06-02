# Siklusio Analytics Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect authenticated Supabase users to Siklusio analytics identity without sending obvious PII as analytics properties.

**Architecture:** Add a pure helper that converts a Supabase user object into safe analytics user properties, then call `analytics.setUser` from `AuthContext` whenever the current user changes. Keep Firebase fallback strategy unchanged for this phase; only wire existing analytics identity behavior.

**Tech Stack:** Expo React Native, Supabase Auth, TypeScript, Node test runner with `tsx`.

---

## File Structure

- Create `mobile-app/src/lib/analyticsIdentity.ts`: pure helper for safe user analytics properties.
- Create `mobile-app/src/lib/analyticsIdentity.test.ts`: unit tests for active/pending/anonymous identity payloads.
- Modify `mobile-app/src/context/AuthContext.tsx`: call `analytics.setUser(user?.id ?? null, properties)` when auth user changes.
- Modify `MERGED_AUDIT_REPORT.md`: mark the `analytics.setUser` wiring as locally remediated while leaving Firebase strategy as follow-up.

---

## Expected Behavior

- Logged-in active user calls analytics with `userId` and safe access status.
- Pending-payment user is labeled `pending_payment`.
- Signed-out state clears analytics user id and properties.
- Email/name/phone are not included in analytics properties.

---

## Verification

- `node --import tsx mobile-app/src/lib/analyticsIdentity.test.ts`
- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
