# Siklusio Phase 30 AI Fallback UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize local fallback UI for AI-powered mobile features so failed AI/API calls do not feel broken or leak raw technical wording.

**Architecture:** Keep behavior small and client-side. Add a pure copy-normalization helper with tests, add one reusable React Native notice component, then replace ad hoc red error boxes in the main AI feature surfaces.

**Tech Stack:** Expo React Native, TypeScript, Node test runner with tsx.

---

### Task 1: AI Fallback Copy Helper

**Files:**
- Create: `mobile-app/src/lib/aiFallback.ts`
- Create: `mobile-app/src/lib/aiFallback.test.ts`

- [x] **Step 1: Write failing tests for AI fallback copy**

Run:

```powershell
node --import tsx mobile-app/src/lib/aiFallback.test.ts
```

Expected RED: `aiFallback.ts` does not exist yet.

- [x] **Step 2: Implement the helper**

Expected behavior:

```text
402 or "saldo kredit" maps to credit-friendly copy.
429 or rate-limit wording maps to pause/retry copy.
fetch/network/timeout wording maps to connection copy.
empty/raw server errors map to calm generic AI fallback copy.
```

### Task 2: Reusable Notice Component

**Files:**
- Create: `mobile-app/components/common/AiFallbackNotice.tsx`

- [x] **Step 1: Implement reusable notice**

Expected behavior:

```text
Component renders normalized title/message/helper and optional retry action.
Styling is inline React Native so it works in modal, sheet, and web render paths.
```

### Task 3: Wire Main AI Surfaces

**Files:**
- Modify: `mobile-app/components/habits/TodayRecipesModal.tsx`
- Modify: `mobile-app/components/habits/HabitCoachSheet.tsx`
- Modify: `mobile-app/components/habits/AiRecommendationSection.tsx`
- Modify: `mobile-app/components/calendar/CycleGuideModal.tsx`
- Modify: `mobile-app/components/calendar/AiReportModal.tsx`
- Modify: `mobile-app/components/dashboard/TwwSanctuaryModal.tsx`

- [x] **Step 1: Replace ad hoc error boxes**

Expected behavior:

```text
Existing AI features keep their current loading/result flows.
Error states use the shared notice and retry where safe.
No new backend behavior or credit charging policy is introduced.
```

### Task 4: Verify And Document

**Files:**
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] **Step 1: Run focused and full verification**

Run:

```powershell
node --import tsx mobile-app/src/lib/aiFallback.test.ts
npm run check
```

Expected: focused test passes and root check remains green.

- [x] **Step 2: Record Phase 30 in merged audit report**

Expected: audit report marks Phase 30 complete and notes one main phase remains.
