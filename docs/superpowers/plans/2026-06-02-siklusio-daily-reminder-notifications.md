# Siklusio Daily Reminder Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the settings reminder toggle's fake sample alert with real local daily notification scheduling on native platforms and honest fallback behavior on web/permission denial.

**Architecture:** Add a pure `dailyReminder` helper with dependency injection so notification behavior can be tested in Node without native Expo modules. Add a thin Expo adapter for `expo-notifications`, then wire Settings to enable/disable the schedule and persist the scheduled notification id.

**Tech Stack:** Expo SDK 54, `expo-notifications`, React Native, TypeScript, node test runner.

---

### Task 1: Add Testable Reminder Domain Logic

**Files:**
- Create: `mobile-app/src/lib/dailyReminder.test.ts`
- Create: `mobile-app/src/lib/dailyReminder.ts`

- [x] **Step 1: Write failing tests**

Create `dailyReminder.test.ts` with tests for:

```ts
buildDailyReminderContent({ userNickname: 'Naya', currentPhase: 'Ovulasi', cycleDay: 14, daysToNextPeriod: 14 })
```

Expected body contains the nickname, phase, cycle day, and ovulation copy.

Also test:

```ts
enableDailyReminder(...)
```

Expected behavior:
- permission denied returns `permission-denied` and does not schedule.
- granted permission cancels any previous schedule id, schedules a daily reminder at 08:00, stores enabled state, and stores the new schedule id.
- disable cancels the stored schedule id, stores enabled false, and removes the stored schedule id.

- [x] **Step 2: Verify RED**

Run:

```powershell
node --import tsx mobile-app/src/lib/dailyReminder.test.ts
```

Expected: FAIL because `dailyReminder.ts` does not exist yet.

- [x] **Step 3: Implement minimal helper**

Create `dailyReminder.ts` with:

```ts
export const DAILY_REMINDER_ENABLED_KEY = 'hs_daily_reminder_enabled';
export const DAILY_REMINDER_NOTIFICATION_ID_KEY = 'hs_daily_reminder_notification_id';
export const DAILY_REMINDER_HOUR = 8;
export const DAILY_REMINDER_MINUTE = 0;
```

Implement `buildDailyReminderContent`, `enableDailyReminder`, `disableDailyReminder`, and `readDailyReminderEnabled`.

- [x] **Step 4: Verify GREEN**

Run:

```powershell
node --import tsx mobile-app/src/lib/dailyReminder.test.ts
```

Expected: PASS.

### Task 2: Add Expo Notifications Adapter

**Files:**
- Modify: `mobile-app/package.json`
- Modify: `mobile-app/package-lock.json`
- Create: `mobile-app/src/lib/expoDailyReminderNotifications.ts`
- Modify: `mobile-app/app/_layout.tsx`

- [x] **Step 1: Install SDK-compatible notification package**

Run from `mobile-app/`:

```powershell
npx expo install expo-notifications
```

Expected: package added at the SDK 54-compatible version.

- [x] **Step 2: Create Expo adapter**

Create an adapter that:
- returns `unsupported` on web.
- sets Android notification channel `daily-reminders`.
- requests notification permission.
- schedules daily notification with trigger type `DAILY`, hour `8`, minute `0`, and Android channel id.
- cancels by notification identifier.

- [x] **Step 3: Configure foreground notification handler**

In `_layout.tsx`, import and call the adapter's configuration function once so foreground notifications can show banners/lists.

### Task 3: Wire Settings Toggle To Real Scheduling

**Files:**
- Modify: `mobile-app/app/(tabs)/settings.tsx`

- [x] **Step 1: Initialize reminder state from storage**

Set `dailyReminder` initial state using `readDailyReminderEnabled(storage)`, defaulting to `false`.

- [x] **Step 2: Make toggle async**

When enabling:
- call `enableDailyReminder(...)`.
- show success only if scheduling succeeds.
- show permission/web/error copy if scheduling fails.

When disabling:
- call `disableDailyReminder(...)`.
- show disabled copy after cancel is attempted.

- [x] **Step 3: Update visible copy**

Replace overpromising text with copy that says notifications are scheduled at 08:00 when enabled.

### Task 4: Verify

**Files:**
- Verify: root project

- [x] **Step 1: Run focused test**

Run:

```powershell
node --import tsx mobile-app/src/lib/dailyReminder.test.ts
```

Expected: PASS.

- [x] **Step 2: Run Expo checks**

Run from `mobile-app/`:

```powershell
npx expo install --check
npx expo-doctor@latest
```

Expected: dependencies up to date and 18/18 checks pass.

- [x] **Step 3: Run root check**

Run:

```powershell
npm run check
```

Expected: backend typecheck, mobile typecheck, and all tests pass.

- [x] **Step 4: Run Worker and Supabase dry-runs**

Run:

```powershell
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
npx supabase db push --dry-run
```

Expected: both pass without deploying/applying migrations.

- [x] **Step 5: Remove Worker dry-run output**

Run:

```powershell
Remove-Item -LiteralPath .wrangler-dry-run -Recurse -Force
Test-Path -LiteralPath .wrangler-dry-run
```

Expected: final output is `False`.

- [x] **Step 6: Run scoped whitespace check**

Run:

```powershell
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html' ':!fitur.md' ':!graphify-out/**' ':!mobile-app/graphify-out/**'
```

Expected: no whitespace errors in this phase scope.
