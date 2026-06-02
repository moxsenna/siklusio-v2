# Siklusio Expo SDK 54 Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile app's Expo SDK 54 package versions back into compatibility so `expo-doctor` passes.

**Architecture:** This phase only touches mobile dependency metadata and lockfile versions required by Expo SDK 54. It intentionally avoids `fitur.md`, `graphify-out/`, and any parallel plan files because those are user/Kiro-owned state in the current worktree.

**Tech Stack:** Expo SDK 54, npm, `expo install --check`, `expo-doctor`, TypeScript.

---

### Task 1: Diagnose Expo SDK 54 Dependency Health

**Files:**
- Inspect: `mobile-app/package.json`
- Inspect: `mobile-app/package-lock.json`
- Inspect: `mobile-app/app.json`

- [x] **Step 1: Run Expo dependency check**

Run:

```powershell
npx expo install --check
```

Expected before remediation:

```text
expo@54.0.34 - expected version: ~54.0.35
expo-font@14.0.11 - expected version: ~14.0.12
expo-router@6.0.23 - expected version: ~6.0.24
```

- [x] **Step 2: Run expo-doctor**

Run:

```powershell
npx expo-doctor@latest
```

Expected before remediation: 17/18 checks pass, with one failed dependency version check for the three packages above.

### Task 2: Patch SDK-Compatible Package Versions

**Files:**
- Modify: `mobile-app/package.json`
- Modify: `mobile-app/package-lock.json`

- [x] **Step 1: Run Expo's fix command**

Run from `mobile-app/`:

```powershell
npx expo install --fix
```

Expected package metadata:

```json
{
  "expo": "~54.0.35",
  "expo-font": "~14.0.12",
  "expo-router": "~6.0.24"
}
```

- [x] **Step 2: Confirm package usage scope**

Run:

```powershell
rg -n "expo-constants|expo-av|expo-font" mobile-app --glob '!node_modules/**' --glob '!graphify-out/**' --glob '!dist/**'
```

Expected: `expo-constants`, `expo-av`, and `expo-font` are still actively used and should not be removed in this phase.

### Task 3: Verify Expo Health And App Checks

**Files:**
- Verify: `mobile-app/`
- Verify: root project

- [x] **Step 1: Re-run Expo dependency check**

Run:

```powershell
npx expo install --check
```

Expected: no outdated dependency warning.

- [x] **Step 2: Re-run expo-doctor**

Run:

```powershell
npx expo-doctor@latest
```

Expected: all 18 checks pass.

- [x] **Step 3: Run root check**

Run from repo root:

```powershell
npm run check
```

Expected: backend typecheck, mobile typecheck, and all tests pass.

- [x] **Step 4: Run Worker dry-run**

Run:

```powershell
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
```

Expected: Worker bundle succeeds without deployment.

- [x] **Step 5: Remove Worker dry-run output**

Run:

```powershell
Remove-Item -LiteralPath .wrangler-dry-run -Recurse -Force
Test-Path -LiteralPath .wrangler-dry-run
```

Expected: final output is `False`.

- [x] **Step 6: Run Supabase dry-run**

Run:

```powershell
npx supabase db push --dry-run
```

Expected: CLI reports pending migrations without applying them.

- [x] **Step 7: Run scoped whitespace check**

Run:

```powershell
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html' ':!fitur.md' ':!graphify-out/**' ':!mobile-app/graphify-out/**'
```

Expected: no whitespace errors in the Phase 23 scope.
