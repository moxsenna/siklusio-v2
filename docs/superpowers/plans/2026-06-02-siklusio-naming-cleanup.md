# Siklusio Naming Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename misleading legacy identifiers so future developers can understand intent without reading implementation details.

**Architecture:** This phase is intentionally small because the repository currently has parallel conflict state in files outside this scope. The first cleanup targets a misleading activity history initializer name and avoids `graphify-out/` entirely per user instruction.

**Tech Stack:** Expo React Native, TypeScript, React Context, npm verification scripts.

---

### Task 1: Rename Empty Activity History Initializer

**Files:**

- Modify: `mobile-app/src/context/CycleContext.tsx`

- [x] **Step 1: Rename the misleading function**

Change:

```ts
const generateMockHistory = (): Record<string, DailyRecord> => {
  return {};
};
```

To:

```ts
const createEmptyActivityHistory = (): Record<string, DailyRecord> => {
  return {};
};
```

Expected: the initializer name explains that it returns an empty persisted history fallback, not mock data.

- [x] **Step 2: Update the persistent state initializer**

Change:

```ts
const [activityHistory, setActivityHistory] = usePersistentState<Record<string, DailyRecord>>(
  "hs_v3_activityHistory",
  generateMockHistory,
);
```

To:

```ts
const [activityHistory, setActivityHistory] = usePersistentState<Record<string, DailyRecord>>(
  "hs_v3_activityHistory",
  createEmptyActivityHistory,
);
```

Expected: no runtime behavior changes; only naming becomes clearer.

### Task 2: Verify The Rename

**Files:**

- Verify: `mobile-app/src/context/CycleContext.tsx`

- [x] **Step 1: Search for the old name**

Run:

```powershell
rg -n "generateMockHistory" mobile-app/src mobile-app/app mobile-app/components --glob '!**/node_modules/**'
```

Expected: no matches.

- [x] **Step 2: Run root check**

Run:

```powershell
npm run check
```

Expected: backend typecheck, mobile typecheck, and all tests pass.

- [x] **Step 3: Run scoped whitespace check**

Run:

```powershell
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html' ':!fitur.md' ':!graphify-out/**' ':!mobile-app/graphify-out/**'
```

Expected: no whitespace errors in this phase scope. `fitur.md` and `graphify-out/` are excluded because they are parallel/user-owned state for now.
