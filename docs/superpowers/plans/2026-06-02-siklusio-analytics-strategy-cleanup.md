# Siklusio Analytics Strategy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Siklusio analytics strategy explicit by keeping GTM/dataLayer for web and making native analytics a documented no-op until a future Firebase native/dev-client lane is intentionally added.

**Architecture:** Refactor `mobile-app/src/lib/analytics.ts` so it no longer dynamically requires `@react-native-firebase/analytics`. Extract small pure payload builders for event, screen view, and user identity pushes; production behavior remains GTM/dataLayer on web and safe no-op on native. Update audit docs so future developers know Firebase native is not active by accident.

**Tech Stack:** Expo Router, React Native `Platform`, GTM dataLayer on web, Node test runner with `tsx`.

---

### Task 1: Add Analytics Payload Tests

**Files:**
- Create: `mobile-app/src/lib/analytics.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for pure helpers that do not need a browser or native runtime:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnalyticsEventPayload,
  buildAnalyticsScreenViewPayload,
  buildAnalyticsUserPayload,
  normalizeAnalyticsEventName,
} from './analytics';

test('normalizeAnalyticsEventName trims, lowercases, and replaces spaces', () => {
  assert.equal(normalizeAnalyticsEventName(' Habit Completed '), 'habit_completed');
});

test('buildAnalyticsEventPayload keeps sanitized event name and metadata', () => {
  assert.deepEqual(buildAnalyticsEventPayload('Symptom Logged', { symptom_type: 'cramp' }), {
    event: 'symptom_logged',
    symptom_type: 'cramp',
  });
});

test('buildAnalyticsScreenViewPayload defaults screen class for GTM', () => {
  assert.deepEqual(buildAnalyticsScreenViewPayload('/(tabs)/calendar'), {
    event: 'screen_view',
    screen_name: '/(tabs)/calendar',
    screen_class: 'ReactNavigation',
  });
});

test('buildAnalyticsUserPayload keeps existing GTM userId key and safe properties', () => {
  assert.deepEqual(buildAnalyticsUserPayload('user-1', { access_status: 'active' }), {
    event: 'user_properties_set',
    userId: 'user-1',
    access_status: 'active',
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```powershell
node --import tsx mobile-app/src/lib/analytics.test.ts
```

Expected: FAIL because the helper exports do not exist yet.

### Task 2: Refactor Analytics Manager To GTM Web-Only

**Files:**
- Modify: `mobile-app/src/lib/analytics.ts`

- [x] **Step 1: Remove Firebase dynamic require**

Delete the top-level `require('@react-native-firebase/analytics')` block and all `firebaseAnalytics` branches. Keep the public `analytics.logEvent`, `analytics.logScreenView`, and `analytics.setUser` methods.

- [x] **Step 2: Add pure payload helpers**

Export:

```ts
export function normalizeAnalyticsEventName(eventName: string): string;
export function buildAnalyticsEventPayload(eventName: string, params?: EventParams): EventParams;
export function buildAnalyticsScreenViewPayload(screenName: string, screenClass?: string): EventParams;
export function buildAnalyticsUserPayload(userId: string | null, properties?: EventParams): EventParams;
```

- [x] **Step 3: Route web pushes through dataLayer only**

Implement a private `pushToDataLayer(payload: EventParams)` that:
- returns immediately when `Platform.OS !== 'web'`.
- returns immediately when `globalThis.window` is unavailable.
- creates `window.dataLayer` if missing.
- catches and logs push errors.

- [x] **Step 4: Verify GREEN**

Run:

```powershell
node --import tsx mobile-app/src/lib/analytics.test.ts
```

Expected: PASS.

### Task 3: Update Documentation

**Files:**
- Modify: `MERGED_AUDIT_REPORT.md`
- Modify: `docs/FEATURE_MATRIX.md` only if analytics policy needs a cross-feature note.

- [x] **Step 1: Update merged audit report**

Record Phase 26 status:
- GTM web remains active via `mobile-app/app/+html.tsx`.
- Firebase native dynamic require removed.
- Native analytics is safe no-op until future dev-client/Firebase implementation.
- `analytics.setUser` remains wired from `AuthContext`.

### Task 4: Verify

**Files:**
- Verify: root project

- [x] **Step 1: Run focused analytics test**

Run:

```powershell
node --import tsx mobile-app/src/lib/analytics.test.ts
```

Expected: PASS.

- [x] **Step 2: Scan for Firebase analytics require**

Run:

```powershell
rg -n "@react-native-firebase/analytics|firebaseAnalytics|Firebase Analytics package not found" mobile-app/src mobile-app/app
```

Expected: no matches.

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
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html' ':!fitur.md' ':!graphify-out/**' ':!mobile-app/graphify-out/**' ':!docs/superpowers/specs/2026-06-02-siklusio-demo-video-design.md' ':!docs/superpowers/plans/2026-06-02-siklusio-demo-video-portrait.md' ':!my-video/**'
```

Expected: no whitespace errors in this phase scope.
