# Habit Coach Plan Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Habit Coach so every generated plan starts today, supports replacing overlapping plans with explicit user confirmation, shows future plan days read-only, adds hydration plus one phase-specific foundation task, and generates 3-5 phase-aware personalized tasks per day for the next 7 days.

**Architecture:** The mobile app owns user interaction, date navigation, and cycle-day snapshots. The backend owns plan persistence, overlap protection, AI prompt construction, credit charging, and archiving replaced plans. Shared behavior is kept in small helpers so date windows, phase snapshots, and task merging can be tested without rendering the app.

**Tech Stack:** Expo Router + React Native Web, TypeScript, date-fns, Hono on Cloudflare Workers, Supabase, OpenRouter JSON schema responses, Node test runner with `tsx`.

---

## Current Problems

1. `HabitsScreen` fetches the active plan for today's date. If today is `2026-05-31`, a plan from `2026-05-25` to `2026-05-31` is still shown. That part is technically correct, but clicking generate should now create a replacement plan from today to today + 6 days.
2. `handleGenerateCoachPlan` currently treats an existing plan as `renewal`, so it starts after the old `weekEnd`. This creates the wrong period for the new desired behavior.
3. The backend rejects overlapping active plans but has no confirmed replacement mode. The app needs a safe way to archive old overlapping plans only after the user confirms.
4. `Tanggal Fokus` only navigates backward. Users need to preview future days inside the active plan, but future tasks must be read-only.
5. The AI prompt only receives `currentPhase`, not the phases for each of the 7 generated dates. The coach cannot adapt the plan across luteal, menstrual, follicular, or ovulation transitions.
6. `HabitCoachSheet` is still a dense form. The desired UX is a guided coach-style discussion with clearer steps and a confirmation screen.
7. The backend schema and prompt currently let AI own the full daily checklist. The new requirement is 1 fixed hydration foundation task, 1 system-generated phase-specific movement/rest foundation task, plus 3-5 AI-generated personalized tasks, for a total of 5-7 tasks per day.

## File Structure

- Modify `mobile-app/src/lib/habitCoachPlan.ts`
  - Keep existing plan mapping and task merge helpers.
  - Mark fixed foundation tasks and AI-generated tasks consistently.
  - Add date window helpers if they are tightly coupled to plan tasks.

- Create `backend/ai/habitCoachFoundation.ts`
  - Own the hydration foundation task that is always inserted into each plan day.
  - Build the second foundation task dynamically from each date's cycle phase so the user gets a concrete action, not an ambiguous instruction.

- Create `mobile-app/src/lib/habitCoachFlow.ts`
  - Own mobile-only helpers for plan windows, date navigation bounds, future read-only checks, and cycle snapshots.

- Modify `mobile-app/src/lib/habitCoachPlan.test.ts`
  - Keep existing tests.
  - Add regression tests for today's 7-day window, future date read-only behavior, and active-plan replacement copy inputs.

- Create `mobile-app/src/lib/habitCoachFlow.test.ts`
  - Test the new flow helpers directly.

- Modify `mobile-app/app/(tabs)/habits.tsx`
  - Fetch active plan for today.
  - Show empty state when no active plan covers today.
  - Allow date navigation through future plan days.
  - Disable checklist toggles on future days.
  - Handle overlap warning and confirmed replacement.
  - Send phase snapshots to backend.

- Modify `mobile-app/components/habits/HabitCoachSheet.tsx`
  - Replace all-at-once form with a 4-step guided coach discussion.
  - Add final review screen and replacement warning state.

- Modify `mobile-app/components/habits/HabitCoachCard.tsx`
  - Show plan range, day number, and CTA text for `Generate`, `Buat Ulang`, or `Review`.

- Modify `backend/ai/habitCoachWindow.ts`
  - Extend date validation helpers for overlap/replacement behavior.

- Modify `backend/ai/habitCoachApi.test.ts`
  - Add helper tests for replacement conflict behavior and prompt payload shape.

- Modify `backend/ai/prompts.ts`
  - Require 3-5 AI-generated personalized tasks per day.
  - Tell AI not to duplicate the fixed foundation tasks.
  - Accept `cycleDays` and prompt AI to adapt each day to that date's phase.

- Modify `backend/ai/schemas.ts`
  - Enforce 3-5 AI-generated tasks per day in the JSON schema and runtime validator.

- Modify `backend/ai/helpers.test.ts`
  - Add regression tests for the new task-count requirement.

- Modify `backend/index.ts`
  - Support `replaceActivePlan: true`.
  - Return structured 409 conflict metadata when replacement is needed.
  - Archive overlapping plans only when replacement is confirmed.

## Commit Strategy

- Commit 1: Mobile/backend helpers and tests.
- Commit 2: Backend replacement and phase-aware prompt.
- Commit 3: Mobile Habit Coach screen and sheet UX.
- Commit 4: Verification fixes, build, and push.

---

### Task 1: Add Mobile Habit Coach Flow Helpers

**Files:**

- Create: `mobile-app/src/lib/habitCoachFlow.ts`
- Create: `mobile-app/src/lib/habitCoachFlow.test.ts`

- [ ] **Step 1: Write failing tests for plan window and navigation bounds**

Create `mobile-app/src/lib/habitCoachFlow.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSevenDayPlanWindow,
  getPlanDateOffsetBounds,
  isFuturePlanDate,
  getPlanDayNumber,
} from "./habitCoachFlow";
import type { HabitCoachPlan } from "./habitCoachTypes";

const plan: HabitCoachPlan = {
  id: "plan-1",
  weekStart: "2026-05-31",
  weekEnd: "2026-06-06",
  mode: "initial",
  status: "active",
  userGoal: "energi stabil",
  coachSummary: "Mulai dari target kecil yang realistis.",
  creditCost: 50,
  days: Array.from({ length: 7 }, (_, index) => ({
    dateKey: [
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ][index],
    dayIndex: index + 1,
    focus: `Fokus ${index + 1}`,
    tasks: [],
  })),
};

test("buildSevenDayPlanWindow starts today and includes 7 dates", () => {
  const window = buildSevenDayPlanWindow(new Date(2026, 4, 31));
  assert.equal(window.weekStart, "2026-05-31");
  assert.equal(window.weekEnd, "2026-06-06");
  assert.deepEqual(window.dateKeys, [
    "2026-05-31",
    "2026-06-01",
    "2026-06-02",
    "2026-06-03",
    "2026-06-04",
    "2026-06-05",
    "2026-06-06",
  ]);
});

test("getPlanDateOffsetBounds lets user preview future plan days only", () => {
  assert.deepEqual(getPlanDateOffsetBounds(plan, "2026-05-31"), {
    minOffset: 0,
    maxOffset: 6,
  });
});

test("future plan days are read-only", () => {
  assert.equal(isFuturePlanDate("2026-06-01", "2026-05-31"), true);
  assert.equal(isFuturePlanDate("2026-05-31", "2026-05-31"), false);
  assert.equal(getPlanDayNumber(plan, "2026-06-02"), 3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
node --import tsx --test mobile-app\src\lib\habitCoachFlow.test.ts
```

Expected: fail because `mobile-app/src/lib/habitCoachFlow.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Create `mobile-app/src/lib/habitCoachFlow.ts`:

```ts
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { HabitCoachPlan } from "./habitCoachTypes";

export interface SevenDayPlanWindow {
  weekStart: string;
  weekEnd: string;
  dateKeys: string[];
}

export function buildSevenDayPlanWindow(today: Date): SevenDayPlanWindow {
  const start = startOfDay(today);
  const dateKeys = Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), "yyyy-MM-dd"),
  );

  return {
    weekStart: dateKeys[0],
    weekEnd: dateKeys[6],
    dateKeys,
  };
}

export function getPlanDateOffsetBounds(
  plan: HabitCoachPlan | null,
  todayDateKey: string,
): { minOffset: number; maxOffset: number } {
  if (!plan) {
    return { minOffset: 0, maxOffset: 0 };
  }

  const planDates = plan.days.map((day) => day.dateKey).sort();
  const first = planDates[0] || todayDateKey;
  const last = planDates[planDates.length - 1] || todayDateKey;

  return {
    minOffset: Math.min(
      0,
      differenceInCalendarDays(new Date(`${first}T00:00:00`), new Date(`${todayDateKey}T00:00:00`)),
    ),
    maxOffset: Math.max(
      0,
      differenceInCalendarDays(new Date(`${last}T00:00:00`), new Date(`${todayDateKey}T00:00:00`)),
    ),
  };
}

export function isFuturePlanDate(dateKey: string, todayDateKey: string) {
  return dateKey > todayDateKey;
}

export function getPlanDayNumber(plan: HabitCoachPlan | null, dateKey: string) {
  return plan?.days.find((day) => day.dateKey === dateKey)?.dayIndex ?? null;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
node --import tsx --test mobile-app\src\lib\habitCoachFlow.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add mobile-app/src/lib/habitCoachFlow.ts mobile-app/src/lib/habitCoachFlow.test.ts
git commit -m "test: add habit coach date flow helpers"
```

---

### Task 2: Add Cycle Snapshots for the 7-Day Plan

**Files:**

- Modify: `mobile-app/src/lib/habitCoachFlow.ts`
- Modify: `mobile-app/src/lib/habitCoachFlow.test.ts`
- Modify: `mobile-app/src/lib/habitCoachTypes.ts`

- [ ] **Step 1: Add failing test for cycle snapshots**

Append to `mobile-app/src/lib/habitCoachFlow.test.ts`:

```ts
import { buildHabitCoachCycleDays } from "./habitCoachFlow";

test("buildHabitCoachCycleDays captures phase per generated date", () => {
  const result = buildHabitCoachCycleDays(["2026-05-31", "2026-06-01"], (date) => ({
    phase: date.getDate() === 31 ? "Luteal" : "Menstrual",
    displayPhase: date.getDate() === 31 ? "Normal" : "Menstruasi",
    cycleDay: date.getDate() === 31 ? 28 : 1,
    isManualPeriod: date.getDate() !== 31,
  }));

  assert.deepEqual(result, [
    {
      dateKey: "2026-05-31",
      dayIndex: 1,
      phase: "Luteal",
      displayPhase: "Normal",
      cycleDay: 28,
      isManualPeriod: false,
    },
    {
      dateKey: "2026-06-01",
      dayIndex: 2,
      phase: "Menstrual",
      displayPhase: "Menstruasi",
      cycleDay: 1,
      isManualPeriod: true,
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
node --import tsx --test mobile-app\src\lib\habitCoachFlow.test.ts
```

Expected: fail because `buildHabitCoachCycleDays` is not exported.

- [ ] **Step 3: Add types**

Modify `mobile-app/src/lib/habitCoachTypes.ts`:

```ts
export interface HabitCoachCycleDay {
  dateKey: string;
  dayIndex: number;
  phase: string;
  displayPhase: string;
  cycleDay: number;
  isManualPeriod: boolean;
}
```

- [ ] **Step 4: Implement snapshot helper**

Append to `mobile-app/src/lib/habitCoachFlow.ts`:

```ts
import type { HabitCoachCycleDay } from "./habitCoachTypes";

export function buildHabitCoachCycleDays(
  dateKeys: string[],
  getDayInfo: (date: Date) => {
    phase: string;
    displayPhase: string;
    cycleDay: number;
    isManualPeriod: boolean;
  },
): HabitCoachCycleDay[] {
  return dateKeys.map((dateKey, index) => {
    const info = getDayInfo(new Date(`${dateKey}T00:00:00`));
    return {
      dateKey,
      dayIndex: index + 1,
      phase: info.phase,
      displayPhase: info.displayPhase,
      cycleDay: info.cycleDay,
      isManualPeriod: info.isManualPeriod,
    };
  });
}
```

If the file already imports from `habitCoachTypes`, merge the import into one line:

```ts
import type { HabitCoachCycleDay, HabitCoachPlan } from "./habitCoachTypes";
```

- [ ] **Step 5: Run helper tests**

Run:

```powershell
node --import tsx --test mobile-app\src\lib\habitCoachFlow.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add mobile-app/src/lib/habitCoachFlow.ts mobile-app/src/lib/habitCoachFlow.test.ts mobile-app/src/lib/habitCoachTypes.ts
git commit -m "feat: capture habit coach cycle days"
```

---

### Task 3: Backend Replacement Mode and Conflict Metadata

**Files:**

- Modify: `backend/ai/habitCoachWindow.ts`
- Modify: `backend/ai/habitCoachApi.test.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Add failing tests for replacement flag parsing**

Append to `backend/ai/habitCoachApi.test.ts`:

```ts
import { shouldReplaceActivePlan } from "./habitCoachWindow";

test("shouldReplaceActivePlan only accepts explicit true", () => {
  assert.equal(shouldReplaceActivePlan(true), true);
  assert.equal(shouldReplaceActivePlan(false), false);
  assert.equal(shouldReplaceActivePlan("true"), false);
  assert.equal(shouldReplaceActivePlan(undefined), false);
});
```

- [ ] **Step 2: Run backend helper test to verify failure**

Run:

```powershell
node --import tsx --test backend\ai\habitCoachApi.test.ts
```

Expected: fail because `shouldReplaceActivePlan` is not exported.

- [ ] **Step 3: Implement replacement helper**

Append to `backend/ai/habitCoachWindow.ts`:

```ts
export function shouldReplaceActivePlan(value: unknown) {
  return value === true;
}
```

- [ ] **Step 4: Update backend endpoint conflict behavior**

Modify `backend/index.ts` imports:

```ts
import { isDateKey, isValidHabitCoachWindow, shouldReplaceActivePlan } from "./ai/habitCoachWindow";
```

In `/api/habit-coach/generate`, replace the existing overlap query block with:

```ts
const replaceActivePlan = shouldReplaceActivePlan(body.replaceActivePlan);

const { data: overlappingPlans, error: existingError } = await auth.supabaseAdmin
  .from("habit_coach_plans")
  .select("id, week_start, week_end")
  .eq("user_id", auth.user.id)
  .eq("status", "active")
  .lte("week_start", body.weekEnd)
  .gte("week_end", body.weekStart);

if (existingError) throw existingError;

if (overlappingPlans && overlappingPlans.length > 0 && !replaceActivePlan) {
  const latestEnd = overlappingPlans
    .map((plan: any) => String(plan.week_end))
    .sort()
    .at(-1);

  return c.json(
    {
      error: "Kamu masih punya rencana habit aktif.",
      code: "ACTIVE_PLAN_OVERLAP",
      planId: overlappingPlans[0].id,
      activeUntil: latestEnd,
      message: `Kamu masih punya plan aktif sampai ${latestEnd}. Kalau lanjut, plan hari ini sampai 7 hari ke depan akan dibuat ulang.`,
    },
    409,
  );
}
```

After `insertDaysError` check and before charging credits, add:

```ts
if (overlappingPlans && overlappingPlans.length > 0 && replaceActivePlan) {
  const overlapIds = overlappingPlans.map((plan: any) => plan.id);
  const { error: archiveError } = await auth.supabaseAdmin
    .from("habit_coach_plans")
    .update({ status: "archived" })
    .in("id", overlapIds);

  if (archiveError) throw archiveError;
}
```

- [ ] **Step 5: Run backend test and typecheck**

Run:

```powershell
node --import tsx --test backend\ai\habitCoachApi.test.ts
npx.cmd tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --skipLibCheck --allowJs --jsx react-jsx backend\index.ts
```

Expected: both pass.

- [ ] **Step 6: Commit**

```powershell
git add backend/ai/habitCoachWindow.ts backend/ai/habitCoachApi.test.ts backend/index.ts
git commit -m "feat: support replacing active habit plans"
```

---

### Task 4: Add Foundation Tasks with Phase-Specific Daily Action

**Files:**

- Create: `backend/ai/habitCoachFoundation.ts`
- Modify: `backend/ai/helpers.test.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Add failing tests for foundation tasks**

Append to `backend/ai/helpers.test.ts`:

```ts
import { buildHabitCoachDayTasks } from "./habitCoachFoundation";

test("buildHabitCoachDayTasks prepends hydration and phase-specific foundation tasks", () => {
  const tasks = buildHabitCoachDayTasks(
    [makeTask("personal-1"), makeTask("personal-2"), makeTask("personal-3")],
    { phase: "Luteal", displayPhase: "Normal", cycleDay: 24 },
  );

  assert.equal(tasks.length, 5);
  assert.equal(tasks[0].id, "foundation-water");
  assert.equal(tasks[0].text, "Minum air putih 2 liter bertahap");
  assert.equal(tasks[1].id, "foundation-luteal-release");
  assert.equal(tasks[1].text, "Peregangan pinggang dan bahu 7 menit");
  assert.equal(tasks[2].id, "personal-1");
});

test("buildHabitCoachDayTasks uses menstrual-friendly foundation action", () => {
  const tasks = buildHabitCoachDayTasks(
    [makeTask("personal-1"), makeTask("personal-2"), makeTask("personal-3")],
    { phase: "Menstrual", displayPhase: "Menstruasi", cycleDay: 1 },
  );

  assert.equal(tasks[1].id, "foundation-menstrual-warmth");
  assert.equal(tasks[1].text, "Kompres hangat perut bawah 10 menit");
});

test("buildHabitCoachDayTasks uses ovulation-friendly foundation action", () => {
  const tasks = buildHabitCoachDayTasks(
    [makeTask("personal-1"), makeTask("personal-2"), makeTask("personal-3")],
    { phase: "Ovulasi", displayPhase: "Masa Subur", cycleDay: 14 },
  );

  assert.equal(tasks[1].id, "foundation-ovulation-walk");
  assert.equal(tasks[1].text, "Jalan santai 10 menit setelah makan");
});

test("buildHabitCoachDayTasks avoids duplicate foundation-like AI tasks", () => {
  const tasks = buildHabitCoachDayTasks(
    [
      {
        id: "water-copy",
        text: "Minum air putih 2 liter",
        emoji: "water",
        category: "hydration",
        reason: "Duplikat foundation.",
      },
      {
        id: "movement-copy",
        text: "Jalan santai 5 menit",
        emoji: "walk",
        category: "movement",
        reason: "Duplikat foundation.",
      },
      makeTask("personal-1"),
      makeTask("personal-2"),
      makeTask("personal-3"),
    ],
    { phase: "Ovulasi", displayPhase: "Masa Subur", cycleDay: 14 },
  );

  assert.equal(tasks.length, 5);
  assert.equal(tasks.filter((task) => task.category === "hydration").length, 1);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
node --import tsx --test backend\ai\helpers.test.ts
```

Expected: fail because `backend/ai/habitCoachFoundation.ts` does not exist.

- [ ] **Step 3: Implement foundation helper**

Create `backend/ai/habitCoachFoundation.ts`:

```ts
type HabitCoachGeneratedTask = {
  id: string;
  text: string;
  emoji: string;
  category: string;
  reason: string;
};

export type HabitCoachFoundationContext = {
  phase?: string;
  displayPhase?: string;
  cycleDay?: number;
};

export const habitCoachHydrationTask: HabitCoachGeneratedTask = {
  id: "foundation-water",
  text: "Minum air putih 2 liter bertahap",
  emoji: "water",
  category: "hydration",
  reason: "Hidrasi membantu energi, lendir serviks, dan pemulihan tubuh tetap stabil.",
};

export function buildPhaseFoundationTask(
  context: HabitCoachFoundationContext,
): HabitCoachGeneratedTask {
  if (context.phase === "Menstrual") {
    return {
      id: "foundation-menstrual-warmth",
      text: "Kompres hangat perut bawah 10 menit",
      emoji: "warmth",
      category: "rest",
      reason: "Rasa hangat membantu tubuh lebih rileks saat fase haid.",
    };
  }

  if (context.phase === "Ovulasi") {
    return {
      id: "foundation-ovulation-walk",
      text: "Jalan santai 10 menit setelah makan",
      emoji: "walk",
      category: "movement",
      reason: "Gerak ringan menjaga energi dan sirkulasi tanpa menguras tubuh.",
    };
  }

  if (context.phase === "Folikular") {
    return {
      id: "foundation-follicular-mobility",
      text: "Peregangan seluruh badan 8 menit",
      emoji: "stretch",
      category: "movement",
      reason: "Fase ini biasanya lebih mendukung energi ringan dan mobilitas tubuh.",
    };
  }

  return {
    id: "foundation-luteal-release",
    text: "Peregangan pinggang dan bahu 7 menit",
    emoji: "stretch",
    category: "movement",
    reason: "Peregangan lembut membantu mengurangi tegang dan overload di fase luteal.",
  };
}

export function buildHabitCoachDayTasks(
  tasks: HabitCoachGeneratedTask[],
  context: HabitCoachFoundationContext,
) {
  const phaseFoundationTask = buildPhaseFoundationTask(context);
  const uniqueAiTasks = tasks.filter((task) => !isFoundationDuplicate(task, phaseFoundationTask));
  return [habitCoachHydrationTask, phaseFoundationTask, ...uniqueAiTasks];
}
```

Replace the old static foundation array example entirely. The helper should not contain this old static array:

```ts
export const habitCoachFoundationTasks: HabitCoachGeneratedTask[] = [
  {
    id: "foundation-water",
    text: "Minum air putih 2 liter bertahap",
    emoji: "water",
    category: "hydration",
    reason: "Hidrasi membantu energi, lendir serviks, dan pemulihan tubuh tetap stabil.",
  },
];
```

function isFoundationDuplicate(
task: HabitCoachGeneratedTask,
phaseFoundationTask: HabitCoachGeneratedTask
) {
const text = task.text.toLowerCase();
return (
text.includes("2 liter") ||
text.includes("air putih") ||
text === phaseFoundationTask.text.toLowerCase() ||
text.includes("jalan santai") ||
text.includes("kompres hangat") ||
text.includes("stretching") ||
text.includes("peregangan")
);
}

````

- [ ] **Step 4: Insert foundation tasks before saving plan days**

Modify `backend/index.ts` imports:

```ts
import { buildHabitCoachDayTasks } from "./ai/habitCoachFoundation";
````

Replace:

```ts
      tasks: day.tasks,
```

with:

```ts
      tasks: buildHabitCoachDayTasks(day.tasks, body.cycleDays?.[index] || {}),
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --import tsx --test backend\ai\helpers.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add backend/ai/habitCoachFoundation.ts backend/ai/helpers.test.ts backend/index.ts
git commit -m "feat: add fixed daily habit foundations"
```

---

### Task 5: Enforce 3-5 Personalized AI Tasks and Make the Prompt Phase-Aware

**Files:**

- Modify: `backend/ai/schemas.ts`
- Modify: `backend/ai/helpers.test.ts`
- Modify: `backend/ai/prompts.ts`
- Modify: `backend/ai/habitCoachApi.test.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Add failing tests for 3-5 AI task count validation**

Append to `backend/ai/helpers.test.ts`:

```ts
test("validateHabitCoachPlan requires at least three AI-generated tasks per day", () => {
  const plan = makeValidHabitPlan();
  plan.days[0].tasks = [makeTask("a"), makeTask("b")];

  assert.throws(
    () => validateHabitCoachPlan(plan),
    /Each habit coach day must contain 3 to 5 personalized tasks/,
  );
});

test("validateHabitCoachPlan rejects more than five AI-generated tasks per day", () => {
  const plan = makeValidHabitPlan();
  plan.days[0].tasks = [
    makeTask("a"),
    makeTask("b"),
    makeTask("c"),
    makeTask("d"),
    makeTask("e"),
    makeTask("f"),
  ];

  assert.throws(
    () => validateHabitCoachPlan(plan),
    /Each habit coach day must contain 3 to 5 personalized tasks/,
  );
});
```

- [ ] **Step 2: Run schema tests to verify failure**

Run:

```powershell
node --import tsx --test backend\ai\helpers.test.ts
```

Expected: fail because runtime validation still uses the old error copy.

- [ ] **Step 3: Update schema min/max and runtime validator**

Modify `backend/ai/schemas.ts` inside `habitCoachPlanSchema.tasks`:

```ts
minItems: 3,
maxItems: 5,
```

Modify runtime validation:

```ts
if (day.tasks.length < 3 || day.tasks.length > 5) {
  throw new Error("Each habit coach day must contain 3 to 5 personalized tasks");
}
```

- [ ] **Step 4: Run schema tests to verify pass**

Run:

```powershell
node --import tsx --test backend\ai\helpers.test.ts
```

Expected: pass.

- [ ] **Step 5: Add failing test for `cycleDays` payload**

Modify `buildHabitCoachMessages` test in `backend/ai/habitCoachApi.test.ts` so the call includes:

```ts
    cycleDays: [
      {
        dateKey: "2026-05-31",
        dayIndex: 1,
        phase: "Luteal",
        displayPhase: "Normal",
        cycleDay: 28,
        isManualPeriod: false,
      },
      {
        dateKey: "2026-06-01",
        dayIndex: 2,
        phase: "Menstrual",
        displayPhase: "Menstruasi",
        cycleDay: 1,
        isManualPeriod: true,
      },
    ],
```

Add assertions:

```ts
assert.equal(userPayload.cycleDays[0].phase, "Luteal");
assert.match(userPayload.rules.join(" "), /fase setiap tanggal/i);
assert.match(userPayload.rules.join(" "), /3 sampai 5/i);
assert.match(userPayload.rules.join(" "), /task wajib hidrasi/i);
assert.match(userPayload.rules.join(" "), /task wajib kedua/i);
assert.match(userPayload.rules.join(" "), /alasan singkat/i);
```

- [ ] **Step 6: Run prompt test to verify failure**

Run:

```powershell
node --import tsx --test backend\ai\habitCoachApi.test.ts
```

Expected: TypeScript or assertion failure because `cycleDays` is not part of `buildHabitCoachMessages`.

- [ ] **Step 7: Update prompt function signature and payload**

Modify `backend/ai/prompts.ts`:

```ts
export function buildHabitCoachMessages(input: {
  nickname: string;
  mode: "initial" | "renewal";
  answers: Array<{ question: string; answer: string }>;
  cycleSnapshot: Record<string, unknown>;
  cycleDays?: Array<{
    dateKey: string;
    dayIndex: number;
    phase: string;
    displayPhase: string;
    cycleDay: number;
    isManualPeriod: boolean;
  }>;
  previousSummary: Record<string, unknown>;
}) {
```

Inside JSON payload, add:

```ts
        cycleDays: input.cycleDays || [],
```

Add these exact rules:

```ts
          "Generate 3 sampai 5 task personal tambahan per hari; jangan memasukkan task wajib hidrasi atau task wajib kedua yang sudah disediakan sistem berdasarkan fase.",
          "Gunakan cycleDays sebagai sumber fase untuk setiap tanggal; jangan hanya memakai currentPhase.",
          "Task tiap hari harus cocok dengan fase setiap tanggal: menstrual fokus istirahat, hangat, hidrasi; follicular fokus energi ringan; ovulasi fokus promil, koneksi, dan gerak ringan; luteal fokus tenang, tidur, anti-overload.",
          "Jangan membuat task yang bertentangan dengan batasan user atau fase hari itu.",
          "Setiap task personal wajib spesifik, bisa diceklis, dan punya alasan singkat yang menjelaskan manfaatnya untuk fase atau kondisi user.",
          "Susun task harian dengan campuran kategori yang sehat: hidrasi, nutrisi, gerak ringan, istirahat, emosional, promil, atau partner sesuai kebutuhan hari itu.",
          "Jangan membuat task generik seperti 'jaga kesehatan' tanpa aksi konkret.",
```

- [ ] **Step 8: Remove old full-checklist task rule**

In `backend/ai/prompts.ts`, replace:

```ts
          "Setiap hari berisi 3 sampai 5 habit kecil.",
```

with:

```ts
          "Generate 3 sampai 5 task personal tambahan per hari; jangan memasukkan task wajib hidrasi atau task wajib kedua yang sudah disediakan sistem berdasarkan fase.",
```

- [ ] **Step 9: Pass `cycleDays` from backend body**

Modify `backend/index.ts` inside `buildHabitCoachMessages` call:

```ts
        cycleDays: Array.isArray(body.cycleDays) ? body.cycleDays : [],
```

- [ ] **Step 10: Run tests**

Run:

```powershell
node --import tsx --test backend\ai\habitCoachApi.test.ts
node --import tsx --test backend\ai\helpers.test.ts
```

Expected: both pass.

- [ ] **Step 11: Commit**

```powershell
git add backend/ai/schemas.ts backend/ai/helpers.test.ts backend/ai/prompts.ts backend/ai/habitCoachApi.test.ts backend/index.ts
git commit -m "feat: make habit coach phase aware"
```

---

### Task 6: Rework Generate Logic on Mobile

**Files:**

- Modify: `mobile-app/app/(tabs)/habits.tsx`

- [ ] **Step 1: Import new helpers**

Modify imports in `mobile-app/app/(tabs)/habits.tsx`:

```ts
import {
  buildHabitCoachCycleDays,
  buildSevenDayPlanWindow,
  getPlanDateOffsetBounds,
  getPlanDayNumber,
  isFuturePlanDate,
} from "../../src/lib/habitCoachFlow";
```

- [ ] **Step 2: Change viewed date calculation to support future offsets**

Replace:

```ts
const viewedDate = useMemo(() => {
  return subDays(new Date(), Math.abs(viewedDateOffset));
}, [viewedDateOffset]);
```

with:

```ts
const viewedDate = useMemo(() => {
  const today = new Date();
  return viewedDateOffset >= 0
    ? addDays(today, viewedDateOffset)
    : subDays(today, Math.abs(viewedDateOffset));
}, [viewedDateOffset]);
```

- [ ] **Step 3: Add date state helpers**

After `todayPlanFocus`, add:

```ts
const planDayNumber = useMemo(
  () => getPlanDayNumber(habitCoachPlan, dateKey),
  [habitCoachPlan, dateKey],
);
const dateOffsetBounds = useMemo(
  () => getPlanDateOffsetBounds(habitCoachPlan, todayDateKey),
  [habitCoachPlan, todayDateKey],
);
const isViewingFuturePlanDate = isFuturePlanDate(dateKey, todayDateKey);
```

- [ ] **Step 4: Update navigation guards**

Replace `handlePrevDay` and `handleNextDay` with:

```ts
const handlePrevDay = () => {
  if (viewedDateOffset > dateOffsetBounds.minOffset) {
    startTransition(() => {
      setViewedDateOffset((prev) => prev - 1);
    });
  }
};

const handleNextDay = () => {
  if (viewedDateOffset < dateOffsetBounds.maxOffset) {
    startTransition(() => {
      setViewedDateOffset((prev) => prev + 1);
    });
  }
};
```

- [ ] **Step 5: Generate from today every time**

Inside `handleGenerateCoachPlan`, replace week window calculation with:

```ts
const planWindow = buildSevenDayPlanWindow(new Date());
const cycleDays = buildHabitCoachCycleDays(planWindow.dateKeys, getDayInfo);
const previousSummary = habitCoachPlan
  ? summarizeHabitPlanCompletion(habitCoachPlan, activityHistory)
  : null;
```

In request body, replace `weekStart`, `weekEnd`, `dateKeys`, and `cycleSnapshot` with:

```ts
        weekStart: planWindow.weekStart,
        weekEnd: planWindow.weekEnd,
        dateKeys: planWindow.dateKeys,
        activityHistory,
        cycleSnapshot: { currentPhase },
        cycleDays,
        previousSummary,
        replaceActivePlan: replaceConfirmed,
```

Define `replaceConfirmed` in Task 7. In this task, temporarily pass `false` so tests/typecheck can run:

```ts
        replaceActivePlan: false,
```

- [ ] **Step 6: Disable future checkbox**

In task `TouchableOpacity`, change:

```tsx
onPress={() => toggleTask(task.id)}
```

to:

```tsx
onPress={() => {
  if (!isViewingFuturePlanDate) toggleTask(task.id);
}}
disabled={isViewingFuturePlanDate}
```

Change status label:

```tsx
{
  task.done ? "Selesai ✓" : isViewingFuturePlanDate ? "Bisa diceklis nanti" : "Yuk Bisa!";
}
```

- [ ] **Step 7: Show empty state when no plan covers selected date**

Before checklist card, add:

```tsx
{
  !habitCoachPlan && (
    <View className="bg-surface rounded-[28px] p-6 border border-outline-variant mb-6">
      <Text className="text-base font-extrabold text-on-background mb-2">
        Belum ada plan habit untuk hari ini
      </Text>
      <Text className="text-sm text-on-surface-variant leading-6 mb-4">
        Target harian akan kosong sampai kamu membuat plan 7 hari dari Habit Coach.
      </Text>
      <TouchableOpacity
        onPress={() => {
          setCoachError(null);
          setCoachOpen(true);
        }}
        className="py-3 px-4 rounded-2xl bg-primary items-center"
      >
        <Text className="text-white font-bold">Buat plan 7 hari</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Wrap progress and checklist cards so they render only when `habitCoachPlan || tasks.length > 0`.

- [ ] **Step 8: Run mobile typecheck**

Run:

```powershell
npx.cmd tsc -p mobile-app\tsconfig.json --noEmit
```

Expected: pass.

- [ ] **Step 9: Commit**

```powershell
git add "mobile-app/app/(tabs)/habits.tsx"
git commit -m "feat: generate habit plans from today"
```

---

### Task 7: Redesign Habit Coach Sheet into Guided Discussion

**Files:**

- Modify: `mobile-app/components/habits/HabitCoachSheet.tsx`
- Modify: `mobile-app/src/lib/habitCoachTypes.ts`

- [ ] **Step 1: Extend component props**

Update `HabitCoachSheet` props:

```ts
interface Props {
  visible: boolean;
  mode: HabitCoachMode;
  loading: boolean;
  error: string | null;
  balance: number | null;
  activePlanUntil?: string | null;
  needsReplaceConfirmation?: boolean;
  onClose: () => void;
  onGenerate: (answers: CoachQuestionAnswer[], options?: { replaceActivePlan?: boolean }) => void;
}
```

- [ ] **Step 2: Replace questions with 4 guided steps**

Replace `initialQuestions` and `renewalQuestions` with:

```ts
const coachSteps = [
  {
    id: "goal",
    eyebrow: "Langkah 1 dari 4",
    question: "Apa yang paling ingin kamu bantu minggu ini?",
    helper: "Pilih satu fokus utama agar coach tidak membuat plan yang terlalu ramai.",
    placeholder: "Tulis fokusmu sendiri...",
    options: [
      "Energi lebih stabil",
      "Promil lebih konsisten",
      "Pikiran lebih tenang",
      "Tidur lebih rapi",
      "Nutrisi lebih teratur",
      "Isi sendiri...",
    ],
  },
  {
    id: "condition",
    eyebrow: "Langkah 2 dari 4",
    question: "Kondisi yang paling terasa akhir-akhir ini?",
    helper: "Ini membantu coach memilih habit yang lembut dan realistis.",
    placeholder: "Ceritakan kondisi tubuh atau moodmu...",
    options: [
      "Badan cepat lelah",
      "Mood naik turun",
      "Cemas menunggu hasil",
      "Nyeri atau tidak nyaman",
      "Jadwal sedang padat",
      "Isi sendiri...",
    ],
  },
  {
    id: "constraint",
    eyebrow: "Langkah 3 dari 4",
    question: "Apa yang perlu coach hindari?",
    helper: "Batasan ini akan dipakai agar task tidak terasa memaksa.",
    placeholder: "Tulis batasanmu sendiri...",
    options: [
      "Olahraga berat",
      "Makanan ribet atau mahal",
      "Aktivitas malam",
      "Task yang terlalu banyak",
      "Tidak ada batasan khusus",
      "Isi sendiri...",
    ],
  },
  {
    id: "time",
    eyebrow: "Langkah 4 dari 4",
    question: "Kapan waktu paling realistis?",
    helper: "Coach akan membuat habit kecil yang cocok dengan ritmemu.",
    placeholder: "Contoh: sore setelah ashar",
    options: [
      "Pagi hari",
      "Siang hari",
      "Sore hari",
      "Malam sebelum tidur",
      "Fleksibel",
      "Isi sendiri...",
    ],
  },
];
```

- [ ] **Step 3: Add step navigation state**

Inside component:

```ts
const [stepIndex, setStepIndex] = useState(0);
const [answers, setAnswers] = useState<Record<string, string>>({});
const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
const [reviewing, setReviewing] = useState(false);

const currentStep = coachSteps[stepIndex];
const currentAnswer = (answers[currentStep.id] || "").trim();
const canGoNext = currentAnswer.length >= 3;
const canSubmit = coachSteps.every((item) => (answers[item.id] || "").trim().length >= 3);
```

- [ ] **Step 4: Update submit**

```ts
const submit = (replaceActivePlan = false) => {
  onGenerate(
    coachSteps.map((item) => ({
      id: item.id,
      question: item.question,
      answer: (answers[item.id] || "").trim(),
    })),
    { replaceActivePlan },
  );
};
```

- [ ] **Step 5: Render one step at a time**

Replace the `questions.map(...)` block with rendering for `currentStep`. Keep the existing chip logic, but use `currentStep.options`, `currentStep.id`, and `currentStep.placeholder`.

Add footer buttons:

```tsx
{
  !reviewing ? (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <TouchableOpacity
        onPress={() => {
          if (stepIndex === 0) onClose();
          else setStepIndex((value) => value - 1);
        }}
        style={{
          flex: 1,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#e2e8f0",
        }}
      >
        <Text style={{ color: "#475569", fontWeight: "800" }}>
          {stepIndex === 0 ? "Batal" : "Kembali"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          if (stepIndex === coachSteps.length - 1) setReviewing(true);
          else setStepIndex((value) => value + 1);
        }}
        disabled={!canGoNext}
        style={{
          flex: 1,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          backgroundColor: canGoNext ? "#be185d" : "#cbd5e1",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>
          {stepIndex === coachSteps.length - 1 ? "Review" : "Lanjut"}
        </Text>
      </TouchableOpacity>
    </View>
  ) : null;
}
```

- [ ] **Step 6: Render review and replacement warning**

When `reviewing` is true, render:

```tsx
{
  reviewing && (
    <View style={{ gap: 12 }}>
      {coachSteps.map((item) => (
        <View key={item.id} style={{ backgroundColor: "#f8fafc", borderRadius: 14, padding: 12 }}>
          <Text
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            {item.question}
          </Text>
          <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700", marginTop: 4 }}>
            {answers[item.id]}
          </Text>
        </View>
      ))}

      {needsReplaceConfirmation && activePlanUntil && (
        <View
          style={{
            backgroundColor: "#fff7ed",
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: "#fed7aa",
          }}
        >
          <Text style={{ color: "#9a3412", fontSize: 12, fontWeight: "800", lineHeight: 18 }}>
            Kamu masih punya plan aktif sampai {activePlanUntil}. Kalau lanjut, plan hari ini sampai
            7 hari ke depan akan dibuat ulang.
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => submit(Boolean(needsReplaceConfirmation))}
        disabled={!canSubmit || loading}
        activeOpacity={0.85}
        style={{
          backgroundColor: canSubmit ? "#be185d" : "#cbd5e1",
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <FontAwesome name="check" size={13} color="#fff" />
        )}
        <Text style={{ color: "#fff", fontWeight: "800" }}>
          {needsReplaceConfirmation ? "Buat Ulang Plan" : `Gunakan ${creditCost} kredit`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 7: Run typecheck**

Run:

```powershell
npx.cmd tsc -p mobile-app\tsconfig.json --noEmit
```

Expected: pass.

- [ ] **Step 8: Commit**

```powershell
git add mobile-app/components/habits/HabitCoachSheet.tsx mobile-app/src/lib/habitCoachTypes.ts
git commit -m "feat: improve habit coach discussion flow"
```

---

### Task 8: Wire Replacement Warning End-to-End

**Files:**

- Modify: `mobile-app/app/(tabs)/habits.tsx`
- Modify: `mobile-app/src/lib/api.ts` if typed error metadata is needed

- [ ] **Step 1: Add conflict state**

Inside `HabitsScreen` state:

```ts
const [activePlanUntil, setActivePlanUntil] = useState<string | null>(null);
const [needsReplaceConfirmation, setNeedsReplaceConfirmation] = useState(false);
```

- [ ] **Step 2: Update handler signature**

Replace:

```ts
  const handleGenerateCoachPlan = async (answers: CoachQuestionAnswer[]) => {
```

with:

```ts
  const handleGenerateCoachPlan = async (
    answers: CoachQuestionAnswer[],
    options: { replaceActivePlan?: boolean } = {}
  ) => {
```

- [ ] **Step 3: Pass replacement option to backend**

In request body:

```ts
        replaceActivePlan: Boolean(options.replaceActivePlan),
```

- [ ] **Step 4: Handle 409 conflict**

In `catch`, before `const message`:

```ts
if (error?.message?.includes("plan aktif") || error?.message?.includes("ACTIVE_PLAN_OVERLAP")) {
  setNeedsReplaceConfirmation(true);
  setActivePlanUntil(habitCoachPlan?.weekEnd || null);
  setCoachOpen(true);
  setCoachError(null);
  return;
}
```

If `apiPostJson` does not expose structured metadata, change `mobile-app/src/lib/api.ts` error throwing to:

```ts
const error = new Error(json?.error || `Server error (${res.status})`) as Error & {
  status?: number;
  code?: string;
  payload?: any;
};
error.status = res.status;
error.code = json?.code;
error.payload = json;
throw error;
```

Then use:

```ts
if (error?.status === 409 && error?.code === "ACTIVE_PLAN_OVERLAP") {
  setNeedsReplaceConfirmation(true);
  setActivePlanUntil(error.payload?.activeUntil || habitCoachPlan?.weekEnd || null);
  setCoachOpen(true);
  setCoachError(null);
  return;
}
```

- [ ] **Step 5: Reset warning on close and success**

When opening fresh:

```ts
setNeedsReplaceConfirmation(false);
setActivePlanUntil(null);
```

After successful generation:

```ts
setNeedsReplaceConfirmation(false);
setActivePlanUntil(null);
```

- [ ] **Step 6: Pass props to `HabitCoachSheet`**

```tsx
activePlanUntil = { activePlanUntil };
needsReplaceConfirmation = { needsReplaceConfirmation };
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```powershell
npx.cmd tsc -p mobile-app\tsconfig.json --noEmit
node --import tsx --test backend\ai\*.test.ts mobile-app\src\lib\*.test.ts
```

Expected: both pass.

- [ ] **Step 8: Commit**

```powershell
git add "mobile-app/app/(tabs)/habits.tsx" mobile-app/src/lib/api.ts mobile-app/components/habits/HabitCoachSheet.tsx
git commit -m "feat: confirm habit plan replacement"
```

---

### Task 9: Show Task Reasons and Future Preview UI

**Files:**

- Modify: `mobile-app/app/(tabs)/habits.tsx`
- Modify: `mobile-app/components/habits/HabitCoachCard.tsx`

- [ ] **Step 1: Add day/range display props to `HabitCoachCard`**

Update props:

```ts
  currentPlanDay?: number | null;
```

Render under the focus card:

```tsx
{
  currentPlanDay && (
    <Text style={{ fontSize: 12, color: "#64748b" }}>Hari {currentPlanDay} dari 7</Text>
  );
}
```

- [ ] **Step 2: Pass day number**

In `HabitsScreen`:

```tsx
                currentPlanDay={getPlanDayNumber(habitCoachPlan, todayDateKey)}
```

- [ ] **Step 3: Render task reason**

Inside each task card, after task text:

```tsx
{
  task.reason ? (
    <Text className="text-xs text-on-surface-variant leading-5 mt-1">{task.reason}</Text>
  ) : null;
}
```

- [ ] **Step 4: Future preview header**

Above checklist title:

```tsx
{
  isViewingFuturePlanDate && (
    <View className="bg-pink-50 border border-pink-100 rounded-2xl p-3 mb-4">
      <Text className="text-xs text-pink-700 font-bold leading-5">
        Ini preview plan untuk tanggal mendatang. Kamu bisa melihat targetnya sekarang, tapi ceklis
        baru aktif saat tanggalnya tiba.
      </Text>
    </View>
  );
}
```

- [ ] **Step 5: Run PWA build**

Run:

```powershell
npm.cmd run build:web
```

Expected: exports `mobile-app/dist` successfully.

- [ ] **Step 6: Commit**

```powershell
git add "mobile-app/app/(tabs)/habits.tsx" mobile-app/components/habits/HabitCoachCard.tsx
git commit -m "feat: polish habit coach preview UI"
```

---

### Task 10: Final Verification, Deploy Backend, Push PWA

**Files:**

- Verify all changed files.

- [ ] **Step 1: Run full targeted tests**

```powershell
node --import tsx --test backend\ai\*.test.ts mobile-app\src\lib\*.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run mobile typecheck**

```powershell
npx.cmd tsc -p mobile-app\tsconfig.json --noEmit
```

Expected: exit code 0.

- [ ] **Step 3: Run backend typecheck**

```powershell
npx.cmd tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --skipLibCheck --allowJs --jsx react-jsx backend\index.ts
```

Expected: exit code 0.

- [ ] **Step 4: Run PWA build**

```powershell
npm.cmd run build:web
```

Expected: `Exported: dist`.

- [ ] **Step 5: Deploy backend**

```powershell
npm.cmd run deploy
```

Expected: Wrangler deploy succeeds and prints a new Worker version ID.

- [ ] **Step 6: Check root lint separately**

```powershell
npm.cmd run lint
```

Expected today: this may still fail on pre-existing Expo alias and `DatePickerField.tsx` errors. If it fails only on those known files, report it as existing repo-level lint debt, not a Habit Coach blocker.

- [ ] **Step 7: Push commits**

```powershell
git push origin main
```

Expected: `main -> main`; Cloudflare Pages auto deploys from GitHub.

---

## Self-Review

**Spec coverage:** Covered today-start plan generation, empty state, replacement warning, future date preview, read-only future tasks, fixed hydration foundation, dynamic phase-specific foundation action, 3-5 personalized AI task count enforcement, phase-aware AI generation, discussion flow UX, task reasons, backend replacement, verification, backend deploy, and GitHub push.

**Placeholder scan:** No placeholder markers or vague testing steps detected. Each task names files, commands, and expected results.

**Type consistency:** `HabitCoachCycleDay`, `buildHabitCoachCycleDays`, `replaceActivePlan`, `ACTIVE_PLAN_OVERLAP`, `activePlanUntil`, and `needsReplaceConfirmation` are defined before use and reused consistently.

**Known external state:** The worktree currently has unrelated dirty files (`graphify-out`, `.superpowers`, profile/onboarding files, recipe files, preview image). Do not stage or revert them unless the user explicitly asks.
