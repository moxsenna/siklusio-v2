# AI Habit Coach And Panduan Siklus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly AI Habit Coach and a distinct Panduan Siklus feature that uses cycle and habit context without duplicating the coach role.

**Architecture:** Habit Coach owns action planning: guided questions, 7-day plans, daily checklist use, review, and renewal. Panduan Siklus owns cycle interpretation: phase, date milestones, prediction confidence, data sufficiency, and optional AI explanation that can reference habit data but cannot create or edit habit plans. Both paid AI flows use backend-only OpenRouter calls and charge credits only after a valid result is saved.

**Tech Stack:** Expo Router, React Native, NativeWind, Hono on Cloudflare Workers, Supabase Postgres, OpenRouter chat completions, Mayar credit top-up later, Node `test`, TypeScript.

---

## Product Boundary

Habit Coach answers: "Apa yang harus aku lakukan 7 hari ke depan?"

Panduan Siklus answers: "Tubuh dan siklusku sedang bagaimana, dan kenapa minggu ini penting?"

Do not let Panduan Siklus generate, regenerate, or edit checklist habits. Its CTA may link to Habit Coach with suggested focus, but Habit Coach remains the only feature that creates habit plans.

## Credit Rules

- Premium initial bonus: 500 credits.
- Habit Coach first 7-day plan: 50 credits.
- Habit Coach review plus next 7-day plan: 60 credits.
- Panduan Siklus AI personal guide: 40 credits.
- TWW AI reply remains separate at 20 credits.
- Credits are charged only after a valid plan or guide is saved.
- Failed model calls, invalid JSON, validation failures, and server errors do not charge credits.
- Backend prechecks balance before calling OpenRouter to avoid unnecessary cost, then saves a valid result as `pending_charge`, charges credits, and marks it `active` only after the charge succeeds.

## File Structure

### Database

- Create: `supabase/ai_credits.sql`
  - AI credit balance, ledger, and transactional RPC helpers.
- Create: `supabase/habit_coach.sql`
  - Habit coach plans and plan days.
- Create: `supabase/cycle_guides.sql`
  - Saved Panduan Siklus AI guide history.

### Backend

- Create: `backend/ai/openRouter.ts`
  - OpenRouter fetch wrapper with model fallback and structured JSON parsing.
- Create: `backend/ai/schemas.ts`
  - Runtime validators for Habit Coach and Panduan Siklus responses.
- Create: `backend/ai/prompts.ts`
  - Prompt builders with strict role boundaries and medical safety language.
- Create: `backend/ai/credits.ts`
  - Credit balance helpers and charge RPC calls.
- Create: `backend/ai/habitSummary.ts`
  - Server-side summaries of activity history and previous habit plans.
- Create: `backend/ai/cycleGuideSummary.ts`
  - Server-side cycle guide summary builder for AI context.
- Modify: `backend/index.ts`
  - Add OpenRouter env bindings and new endpoints.
- Modify: `.env.example`
  - Replace Gemini-centered AI env docs with OpenRouter env docs.

### Mobile Shared Logic

- Create: `mobile-app/src/lib/habitCoachTypes.ts`
  - Shared mobile types for coach answers, plans, plan days, and plan tasks.
- Create: `mobile-app/src/lib/habitCoachPlan.ts`
  - Week helpers, completion summaries, and plan-to-daily-task mapping.
- Test: `mobile-app/src/lib/habitCoachPlan.test.ts`
- Create: `mobile-app/src/lib/cycleGuideSummary.ts`
  - Deterministic data sufficiency and guide preview logic.
- Test: `mobile-app/src/lib/cycleGuideSummary.test.ts`
- Modify: `mobile-app/src/lib/cycleUtils.ts`
  - Allow optional habit coach metadata on tasks without breaking old records.

### Mobile UI

- Modify: `mobile-app/app/(tabs)/habits.tsx`
  - Use active Habit Coach plan tasks when available; keep fallback tasks for users with no plan.
- Create: `mobile-app/components/habits/HabitCoachCard.tsx`
  - Entry point and plan status.
- Create: `mobile-app/components/habits/HabitCoachSheet.tsx`
  - Guided coach questions and generate/review flow.
- Create: `mobile-app/components/habits/HabitPlanWeekView.tsx`
  - 7-day plan preview and completion summary.
- Modify: `mobile-app/components/habits/AiRecommendationSection.tsx`
  - Remove or demote the old generic AI insight once Habit Coach is active.
- Modify: `mobile-app/app/(tabs)/calendar.tsx`
  - Replace "AI Cycle Analysis" entry with Panduan Siklus.
- Create: `mobile-app/components/calendar/CycleGuideCard.tsx`
  - Deterministic guide preview for new and returning users.
- Create: `mobile-app/components/calendar/CycleGuideModal.tsx`
  - Full Panduan Siklus result and optional 40-credit AI personalization.

---

## Task 1: Database Credit Foundation

**Files:**

- Create: `supabase/ai_credits.sql`

- [ ] **Step 1: Create the SQL migration**

Add this file:

```sql
-- ============================================================
-- AI credit balances and ledger
-- Run after supabase/schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_credit_balances (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  feature TEXT NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_ai_credit_balances" ON public.ai_credit_balances;
CREATE POLICY "service_role_full_access_ai_credit_balances"
ON public.ai_credit_balances TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_ai_credit_ledger" ON public.ai_credit_ledger;
CREATE POLICY "service_role_full_access_ai_credit_ledger"
ON public.ai_credit_ledger TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_created
ON public.ai_credit_ledger(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ensure_ai_credit_balance(p_user_id UUID)
RETURNS public.ai_credit_balances
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_out public.ai_credit_balances;
BEGIN
  INSERT INTO public.ai_credit_balances(user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO row_out
  FROM public.ai_credit_balances
  WHERE user_id = p_user_id;

  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_ai_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'grant amount must be positive';
  END IF;

  PERFORM public.ensure_ai_credit_balance(p_user_id);

  UPDATE public.ai_credit_balances
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger(
    user_id, amount, balance_after, feature, reason, reference_id, metadata
  )
  VALUES (
    p_user_id, p_amount, new_balance, p_feature, p_reason, p_reference_id, p_metadata
  );

  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.charge_ai_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reason TEXT,
  p_reference_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'charge amount must be positive';
  END IF;

  PERFORM public.ensure_ai_credit_balance(p_user_id);

  SELECT balance INTO current_balance
  FROM public.ai_credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_ai_credits:%:%', current_balance, p_amount;
  END IF;

  UPDATE public.ai_credit_balances
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger(
    user_id, amount, balance_after, feature, reason, reference_id, metadata
  )
  VALUES (
    p_user_id, -p_amount, new_balance, p_feature, p_reason, p_reference_id, p_metadata
  );

  RETURN new_balance;
END;
$$;
```

- [ ] **Step 2: Apply the migration in Supabase**

Run this manually in Supabase SQL editor, or through the project's preferred Supabase migration workflow:

```powershell
# Manual SQL editor is preferred for this project unless Supabase CLI is configured.
```

Expected: `ai_credit_balances`, `ai_credit_ledger`, `grant_ai_credits`, and `charge_ai_credits` exist.

- [ ] **Step 3: Commit**

```powershell
git add supabase/ai_credits.sql
git commit -m "feat: add ai credit ledger"
```

---

## Task 2: Habit Coach Schema

**Files:**

- Create: `supabase/habit_coach.sql`

- [ ] **Step 1: Create the SQL migration**

```sql
-- ============================================================
-- Weekly AI Habit Coach plans
-- Run after supabase/ai_credits.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_coach_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'completed', 'archived')),
  mode TEXT NOT NULL
    CHECK (mode IN ('initial', 'renewal')),
  user_goal TEXT NOT NULL,
  user_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  cycle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  coach_summary TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start, status)
);

CREATE TABLE IF NOT EXISTS public.habit_coach_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.habit_coach_plans(id) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 1 AND 7),
  focus TEXT NOT NULL,
  tasks JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, date_key)
);

ALTER TABLE public.habit_coach_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_coach_plan_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_habit_coach_plans" ON public.habit_coach_plans;
CREATE POLICY "service_role_full_access_habit_coach_plans"
ON public.habit_coach_plans TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_habit_coach_plan_days" ON public.habit_coach_plan_days;
CREATE POLICY "service_role_full_access_habit_coach_plan_days"
ON public.habit_coach_plan_days TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_habit_coach_plans_user_week
ON public.habit_coach_plans(user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_habit_coach_plan_days_plan
ON public.habit_coach_plan_days(plan_id, day_index);
```

- [ ] **Step 2: Apply the migration**

Run the SQL after `supabase/ai_credits.sql`.

Expected: habit coach plans can be saved by the service role only.

- [ ] **Step 3: Commit**

```powershell
git add supabase/habit_coach.sql
git commit -m "feat: add habit coach plan tables"
```

---

## Task 3: Panduan Siklus Schema

**Files:**

- Create: `supabase/cycle_guides.sql`

- [ ] **Step 1: Create the SQL migration**

```sql
-- ============================================================
-- Saved AI Panduan Siklus results
-- Run after supabase/ai_credits.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cycle_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  guide_level TEXT NOT NULL CHECK (guide_level IN ('starter', 'active', 'personal')),
  cycle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  habit_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'archived')),
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cycle_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_cycle_guides" ON public.cycle_guides;
CREATE POLICY "service_role_full_access_cycle_guides"
ON public.cycle_guides TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cycle_guides_user_date
ON public.cycle_guides(user_id, generated_for_date DESC);
```

- [ ] **Step 2: Apply the migration**

Run the SQL after `supabase/ai_credits.sql`.

Expected: guide results can be stored and retrieved through backend endpoints.

- [ ] **Step 3: Commit**

```powershell
git add supabase/cycle_guides.sql
git commit -m "feat: add cycle guide history"
```

---

## Task 4: Mobile Habit Coach Types And Summaries

**Files:**

- Create: `mobile-app/src/lib/habitCoachTypes.ts`
- Create: `mobile-app/src/lib/habitCoachPlan.ts`
- Test: `mobile-app/src/lib/habitCoachPlan.test.ts`
- Modify: `mobile-app/src/lib/cycleUtils.ts`

- [ ] **Step 1: Write failing tests**

Create `mobile-app/src/lib/habitCoachPlan.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { format } from "date-fns";
import {
  getLocalWeekStart,
  summarizeHabitPlanCompletion,
  getPlanTasksForDate,
} from "./habitCoachPlan";
import type { HabitCoachPlan } from "./habitCoachTypes";
import type { DailyRecord } from "./cycleUtils";

const plan: HabitCoachPlan = {
  id: "plan-1",
  weekStart: "2026-05-25",
  weekEnd: "2026-05-31",
  mode: "initial",
  status: "active",
  userGoal: "promil aktif",
  coachSummary: "Fokus ringan dan konsisten.",
  creditCost: 50,
  days: [
    {
      dateKey: "2026-05-25",
      dayIndex: 1,
      focus: "hidrasi",
      tasks: [
        {
          id: "water-1",
          text: "Minum air 6 gelas",
          emoji: "water",
          category: "hydration",
          reason: "Menjaga energi.",
        },
      ],
    },
  ],
};

test("getLocalWeekStart returns Monday for a date in the same week", () => {
  assert.equal(format(getLocalWeekStart(new Date(2026, 4, 30)), "yyyy-MM-dd"), "2026-05-25");
});

test("getPlanTasksForDate maps coach tasks into daily checklist tasks", () => {
  const tasks = getPlanTasksForDate(plan, "2026-05-25");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].text, "Minum air 6 gelas");
  assert.equal(tasks[0].coachPlanId, "plan-1");
  assert.equal(tasks[0].category, "hydration");
});

test("summarizeHabitPlanCompletion counts completed coach tasks only", () => {
  const history: Record<string, DailyRecord> = {
    "2026-05-25": {
      symptoms: ["fatigue"],
      tasks: [
        {
          id: 1,
          text: "Minum air 6 gelas",
          emoji: "water",
          done: true,
          coachPlanId: "plan-1",
          category: "hydration",
        },
        {
          id: 2,
          text: "Fallback task",
          emoji: "star",
          done: true,
        },
      ],
    },
  };

  const summary = summarizeHabitPlanCompletion(plan, history);
  assert.equal(summary.totalTasks, 1);
  assert.equal(summary.completedTasks, 1);
  assert.equal(summary.completionRate, 100);
  assert.deepEqual(summary.symptoms, ["fatigue"]);
});
```

- [ ] **Step 2: Run tests to verify failure**

```powershell
npx tsx mobile-app/src/lib/habitCoachPlan.test.ts
```

Expected: FAIL because `habitCoachPlan` and `habitCoachTypes` do not exist.

- [ ] **Step 3: Add shared types**

Create `mobile-app/src/lib/habitCoachTypes.ts`:

```ts
export type HabitCategory =
  | "hydration"
  | "nutrition"
  | "movement"
  | "rest"
  | "emotional"
  | "promil"
  | "partner";

export type HabitCoachMode = "initial" | "renewal";

export interface CoachQuestionAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface HabitCoachTask {
  id: string;
  text: string;
  emoji: string;
  category: HabitCategory;
  reason: string;
}

export interface HabitCoachPlanDay {
  dateKey: string;
  dayIndex: number;
  focus: string;
  tasks: HabitCoachTask[];
}

export interface HabitCoachPlan {
  id: string;
  weekStart: string;
  weekEnd: string;
  mode: HabitCoachMode;
  status: "pending_charge" | "active" | "completed" | "archived";
  userGoal: string;
  coachSummary: string;
  creditCost: number;
  days: HabitCoachPlanDay[];
}

export interface HabitCoachCompletionSummary {
  planId: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  missedCategories: HabitCategory[];
  symptoms: string[];
}
```

- [ ] **Step 4: Extend local task metadata**

Modify `mobile-app/src/lib/cycleUtils.ts`:

```ts
export interface Task {
  id: number;
  text: string;
  emoji: string;
  done: boolean;
  coachPlanId?: string;
  coachTaskId?: string;
  category?: string;
  reason?: string;
}
```

- [ ] **Step 5: Implement habit plan helpers**

Create `mobile-app/src/lib/habitCoachPlan.ts`:

```ts
import { addDays, format, startOfDay, subDays } from "date-fns";
import type { DailyRecord, Task } from "./cycleUtils";
import type { HabitCategory, HabitCoachCompletionSummary, HabitCoachPlan } from "./habitCoachTypes";

export function getLocalWeekStart(date: Date) {
  const day = startOfDay(date);
  const dayIndex = day.getDay();
  const diffToMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  return subDays(day, diffToMonday);
}

export function getLocalWeekEnd(date: Date) {
  return addDays(getLocalWeekStart(date), 6);
}

export function getPlanTasksForDate(plan: HabitCoachPlan | null, dateKey: string): Task[] {
  if (!plan) return [];

  const planDay = plan.days.find((day) => day.dateKey === dateKey);
  if (!planDay) return [];

  return planDay.tasks.map((task, index) => ({
    id: index + 1,
    text: task.text,
    emoji: task.emoji,
    done: false,
    coachPlanId: plan.id,
    coachTaskId: task.id,
    category: task.category,
    reason: task.reason,
  }));
}

export function summarizeHabitPlanCompletion(
  plan: HabitCoachPlan,
  activityHistory: Record<string, DailyRecord>,
): HabitCoachCompletionSummary {
  const plannedTaskIds = new Set(plan.days.flatMap((day) => day.tasks.map((task) => task.id)));
  const missedCategories = new Set<HabitCategory>();
  const symptoms = new Set<string>();
  let totalTasks = 0;
  let completedTasks = 0;

  for (const day of plan.days) {
    const record = activityHistory[day.dateKey];
    const actualTasks = record?.tasks || [];

    for (const plannedTask of day.tasks) {
      totalTasks += 1;
      const actual = actualTasks.find(
        (task) => task.coachPlanId === plan.id && task.coachTaskId === plannedTask.id,
      );
      if (actual?.done) {
        completedTasks += 1;
      } else {
        missedCategories.add(plannedTask.category);
      }
    }

    for (const symptom of record?.symptoms || []) {
      symptoms.add(symptom);
    }
  }

  return {
    planId: plan.id,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    missedCategories: Array.from(missedCategories),
    symptoms: Array.from(symptoms),
  };
}
```

- [ ] **Step 6: Run tests**

```powershell
npx tsx mobile-app/src/lib/habitCoachPlan.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add mobile-app/src/lib/cycleUtils.ts mobile-app/src/lib/habitCoachTypes.ts mobile-app/src/lib/habitCoachPlan.ts mobile-app/src/lib/habitCoachPlan.test.ts
git commit -m "feat: add habit coach plan helpers"
```

---

## Task 5: Mobile Panduan Siklus Deterministic Summary

**Files:**

- Create: `mobile-app/src/lib/cycleGuideSummary.ts`
- Test: `mobile-app/src/lib/cycleGuideSummary.test.ts`

- [ ] **Step 1: Write failing tests**

Create `mobile-app/src/lib/cycleGuideSummary.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildCycleGuidePreview } from "./cycleGuideSummary";

test("returns starter level for new users with no manual period history", () => {
  const preview = buildCycleGuidePreview({
    currentPhase: "Folikular",
    cycleDay: 7,
    daysToNextPeriod: 21,
    cycleConfidence: "low",
    periodConfidence: "low",
    hasManualLogs: false,
    activityHistory: {},
    activeHabitPlanSummary: null,
  });

  assert.equal(preview.level, "starter");
  assert.match(preview.title, /Panduan awal/);
  assert.equal(preview.canShowPersonalPatterns, false);
});

test("returns active level when user has recent activity but low cycle confidence", () => {
  const preview = buildCycleGuidePreview({
    currentPhase: "Luteal",
    cycleDay: 22,
    daysToNextPeriod: 6,
    cycleConfidence: "low",
    periodConfidence: "medium",
    hasManualLogs: true,
    activityHistory: {
      "2026-05-01": { symptoms: ["fatigue"], tasks: [] },
      "2026-05-02": { symptoms: [], tasks: [] },
    },
    activeHabitPlanSummary: { completionRate: 80 },
  });

  assert.equal(preview.level, "active");
  assert.equal(preview.canShowPersonalPatterns, false);
});

test("returns personal level when confidence and logs are enough", () => {
  const preview = buildCycleGuidePreview({
    currentPhase: "Ovulasi",
    cycleDay: 14,
    daysToNextPeriod: 14,
    cycleConfidence: "high",
    periodConfidence: "high",
    hasManualLogs: true,
    activityHistory: {
      "2026-05-01": { symptoms: ["cramps"], tasks: [] },
      "2026-05-02": { symptoms: ["fatigue"], tasks: [] },
      "2026-05-03": { symptoms: [], tasks: [] },
    },
    activeHabitPlanSummary: { completionRate: 67 },
  });

  assert.equal(preview.level, "personal");
  assert.equal(preview.canShowPersonalPatterns, true);
});
```

- [ ] **Step 2: Run tests to verify failure**

```powershell
npx tsx mobile-app/src/lib/cycleGuideSummary.test.ts
```

Expected: FAIL because `cycleGuideSummary` does not exist.

- [ ] **Step 3: Implement deterministic preview**

Create `mobile-app/src/lib/cycleGuideSummary.ts`:

```ts
import type { CyclePhase, DailyRecord } from "./cycleUtils";
import type { PredictionConfidence } from "./cyclePrediction";

export type CycleGuideLevel = "starter" | "active" | "personal";

interface BuildCycleGuidePreviewInput {
  currentPhase: CyclePhase;
  cycleDay: number;
  daysToNextPeriod: number;
  cycleConfidence: PredictionConfidence;
  periodConfidence: PredictionConfidence;
  hasManualLogs: boolean;
  activityHistory: Record<string, DailyRecord>;
  activeHabitPlanSummary: { completionRate: number } | null;
}

export interface CycleGuidePreview {
  level: CycleGuideLevel;
  title: string;
  summary: string;
  confidenceLabel: string;
  canShowPersonalPatterns: boolean;
  suggestedHabitFocus: string;
}

const phaseCopy: Record<CyclePhase, string> = {
  Menstrual: "tubuh sedang memulai ulang siklus dan biasanya butuh ritme yang lebih lembut",
  Folikular: "energi biasanya mulai naik dan tubuh bersiap menuju masa subur",
  Ovulasi: "masa subur sedang menjadi fokus utama",
  Luteal: "tubuh masuk fase menunggu dan sensitivitas emosi bisa meningkat",
};

function countRecentActivity(activityHistory: Record<string, DailyRecord>) {
  return Object.values(activityHistory).filter((record) => {
    return (
      Boolean(record.isPeriod) ||
      (record.symptoms || []).length > 0 ||
      (record.tasks || []).length > 0
    );
  }).length;
}

function confidenceLabel(confidence: PredictionConfidence) {
  if (confidence === "high") return "Pola cukup stabil";
  if (confidence === "medium") return "Mulai personal";
  return "Butuh catatan lagi";
}

export function buildCycleGuidePreview(input: BuildCycleGuidePreviewInput): CycleGuidePreview {
  const recentActivityCount = countRecentActivity(input.activityHistory);
  const level: CycleGuideLevel =
    input.hasManualLogs && input.cycleConfidence !== "low" && recentActivityCount >= 3
      ? "personal"
      : recentActivityCount > 0 || input.hasManualLogs
        ? "active"
        : "starter";

  const title =
    level === "starter"
      ? "Panduan awal siklusmu"
      : level === "active"
        ? "Panduan minggu ini"
        : "Insight personal siklusmu";

  const suggestedHabitFocus =
    input.currentPhase === "Ovulasi"
      ? "promil dan energi"
      : input.currentPhase === "Menstrual"
        ? "istirahat dan hidrasi"
        : input.currentPhase === "Luteal"
          ? "emosi, tidur, dan ketenangan"
          : "nutrisi dan konsistensi ringan";

  return {
    level,
    title,
    summary: `Hari ke-${input.cycleDay}. Saat ini ${phaseCopy[input.currentPhase]}. Perkiraan haid berikutnya sekitar ${input.daysToNextPeriod} hari lagi.`,
    confidenceLabel: confidenceLabel(input.cycleConfidence),
    canShowPersonalPatterns: level === "personal",
    suggestedHabitFocus,
  };
}
```

- [ ] **Step 4: Run tests**

```powershell
npx tsx mobile-app/src/lib/cycleGuideSummary.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add mobile-app/src/lib/cycleGuideSummary.ts mobile-app/src/lib/cycleGuideSummary.test.ts
git commit -m "feat: add cycle guide preview logic"
```

---

## Task 6: Backend AI And Credit Helpers

**Files:**

- Create: `backend/ai/openRouter.ts`
- Create: `backend/ai/schemas.ts`
- Create: `backend/ai/credits.ts`
- Modify: `backend/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add OpenRouter helper**

Create `backend/ai/openRouter.ts`:

````ts
export interface OpenRouterChatOptions {
  apiKey: string;
  model: string;
  fallbackModels?: string[];
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  responseSchemaName: string;
  responseSchema: Record<string, unknown>;
  maxCompletionTokens?: number;
}

export interface OpenRouterJsonResult<T> {
  model: string;
  data: T;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function stripJsonFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function callOpenRouterJson<T>(
  options: OpenRouterChatOptions,
): Promise<OpenRouterJsonResult<T>> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://app.siklusio.web.id",
      "X-Title": "Siklusio",
    },
    body: JSON.stringify({
      model: options.model,
      models: options.fallbackModels,
      messages: options.messages,
      temperature: 0.4,
      max_completion_tokens: options.maxCompletionTokens ?? 1800,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.responseSchemaName,
          strict: true,
          schema: options.responseSchema,
        },
      },
    }),
  });

  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenRouter error (${response.status})`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned empty content");
  }

  return {
    model: json.model || options.model,
    data: JSON.parse(stripJsonFence(content)) as T,
    usage: json.usage,
  };
}
````

- [ ] **Step 2: Add runtime validators and schemas**

Create `backend/ai/schemas.ts`:

```ts
export const habitCoachPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["coachSummary", "days"],
  properties: {
    coachSummary: { type: "string" },
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dayIndex", "focus", "tasks"],
        properties: {
          dayIndex: { type: "number" },
          focus: { type: "string" },
          tasks: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "text", "emoji", "category", "reason"],
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                emoji: { type: "string" },
                category: {
                  type: "string",
                  enum: [
                    "hydration",
                    "nutrition",
                    "movement",
                    "rest",
                    "emotional",
                    "promil",
                    "partner",
                  ],
                },
                reason: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const cycleGuideSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "bodySignals",
    "importantDates",
    "focusThisWeek",
    "habitCoachBridge",
    "disclaimer",
  ],
  properties: {
    summary: { type: "string" },
    bodySignals: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
    importantDates: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
    focusThisWeek: { type: "string" },
    habitCoachBridge: { type: "string" },
    disclaimer: { type: "string" },
  },
};

export function validateHabitCoachPlan(value: any) {
  if (!value || typeof value.coachSummary !== "string" || !Array.isArray(value.days)) {
    throw new Error("Invalid habit coach plan payload");
  }
  if (value.days.length !== 7) {
    throw new Error("Habit coach plan must contain exactly 7 days");
  }
  for (const day of value.days) {
    if (!Array.isArray(day.tasks) || day.tasks.length < 3 || day.tasks.length > 5) {
      throw new Error("Each habit coach day must contain 3 to 5 tasks");
    }
  }
  return value as {
    coachSummary: string;
    days: Array<{
      dayIndex: number;
      focus: string;
      tasks: Array<{ id: string; text: string; emoji: string; category: string; reason: string }>;
    }>;
  };
}

export function validateCycleGuide(value: any) {
  if (!value || typeof value.summary !== "string" || !Array.isArray(value.bodySignals)) {
    throw new Error("Invalid cycle guide payload");
  }
  return value as {
    summary: string;
    bodySignals: string[];
    importantDates: string[];
    focusThisWeek: string;
    habitCoachBridge: string;
    disclaimer: string;
  };
}
```

- [ ] **Step 3: Add credit helper**

Create `backend/ai/credits.ts`:

```ts
export async function getAiCreditBalance(supabaseAdmin: any, userId: string) {
  await supabaseAdmin.rpc("ensure_ai_credit_balance", { p_user_id: userId });
  const { data, error } = await supabaseAdmin
    .from("ai_credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.balance || 0);
}

export async function chargeAiCredits(params: {
  supabaseAdmin: any;
  userId: string;
  amount: number;
  feature: string;
  reason: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await params.supabaseAdmin.rpc("charge_ai_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_feature: params.feature,
    p_reason: params.reason,
    p_reference_id: params.referenceId,
    p_metadata: params.metadata || {},
  });

  if (error) throw error;
  return Number(data);
}
```

- [ ] **Step 4: Update backend env type**

Modify `backend/index.ts` `Env`:

```ts
interface Env {
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_FREE_MODEL?: string;
  OPENROUTER_PAID_MODEL?: string;
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  MAYAR_API_KEY: string;
  MAYAR_WEBHOOK_TOKEN?: string;
}
```

- [ ] **Step 5: Update `.env.example`**

Add:

```dotenv
# OpenRouter AI
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_FREE_MODEL="qwen/qwen3-next-80b-a3b-instruct:free"
OPENROUTER_PAID_MODEL="openai/gpt-5-nano"
```

Keep `GEMINI_API_KEY` only if older endpoints still use it during transition.

- [ ] **Step 6: Typecheck**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/ai/openRouter.ts backend/ai/schemas.ts backend/ai/credits.ts backend/index.ts .env.example
git commit -m "feat: add openrouter ai helpers"
```

---

## Task 7: Backend Habit Coach Endpoints

**Files:**

- Create: `backend/ai/prompts.ts`
- Create: `backend/ai/habitSummary.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Add prompt builders**

Create `backend/ai/prompts.ts`:

```ts
export function buildHabitCoachMessages(input: {
  nickname: string;
  mode: "initial" | "renewal";
  answers: Array<{ question: string; answer: string }>;
  cycleSnapshot: Record<string, unknown>;
  previousSummary: Record<string, unknown>;
}) {
  return [
    {
      role: "system" as const,
      content:
        "Kamu adalah Habit Coach promil Siklusio. Buat rencana habit 7 hari yang realistis, hangat, praktis, dan aman. Jangan memberi diagnosis medis, jangan menjanjikan hamil, dan jangan menyuruh tindakan berisiko. Output wajib JSON valid sesuai schema.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        nickname: input.nickname,
        mode: input.mode,
        answers: input.answers,
        cycleSnapshot: input.cycleSnapshot,
        previousSummary: input.previousSummary,
        rules: [
          "Setiap hari berisi 3 sampai 5 habit kecil.",
          "Gunakan bahan dan aktivitas yang realistis untuk pengguna Indonesia.",
          "Tulis dalam Bahasa Indonesia dengan kata kamu, bukan Anda.",
          "Habit harus bisa diceklis, spesifik, dan selesai kurang dari 10 menit kecuali user memilih tantangan tinggi.",
          "Jangan membuat plan yang sama persis setiap hari.",
        ],
      }),
    },
  ];
}

export function buildCycleGuideMessages(input: {
  nickname: string;
  guideLevel: "starter" | "active" | "personal";
  cycleSnapshot: Record<string, unknown>;
  habitSnapshot: Record<string, unknown>;
}) {
  return [
    {
      role: "system" as const,
      content:
        "Kamu adalah Panduan Siklus Siklusio. Jelaskan kondisi siklus dan tanggal penting. Jangan membuat checklist habit baru. Jika perlu aksi, arahkan ke Habit Coach. Jangan memberi diagnosis medis atau janji kehamilan. Output wajib JSON valid sesuai schema.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        nickname: input.nickname,
        guideLevel: input.guideLevel,
        cycleSnapshot: input.cycleSnapshot,
        habitSnapshot: input.habitSnapshot,
        tone: "hangat, jelas, singkat, tidak menggurui",
      }),
    },
  ];
}
```

- [ ] **Step 2: Add server-side habit summary helper**

Create `backend/ai/habitSummary.ts`:

```ts
export function summarizeActivityHistory(activityHistory: Record<string, any>) {
  const entries = Object.entries(activityHistory || {}).sort(([a], [b]) => a.localeCompare(b));
  const last14 = entries.slice(-14);
  const symptoms: Record<string, number> = {};
  let totalTasks = 0;
  let completedTasks = 0;
  let periodDays = 0;

  for (const [, record] of last14) {
    if (record?.isPeriod) periodDays += 1;
    for (const symptom of record?.symptoms || []) {
      symptoms[symptom] = (symptoms[symptom] || 0) + 1;
    }
    for (const task of record?.tasks || []) {
      if (task?.coachPlanId) {
        totalTasks += 1;
        if (task.done) completedTasks += 1;
      }
    }
  }

  return {
    daysObserved: last14.length,
    periodDays,
    symptomCounts: symptoms,
    coachTaskCompletionRate:
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null,
  };
}
```

- [ ] **Step 3: Add endpoints to `backend/index.ts`**

Add imports:

```ts
import { callOpenRouterJson } from "./ai/openRouter";
import { chargeAiCredits, getAiCreditBalance } from "./ai/credits";
import { buildHabitCoachMessages } from "./ai/prompts";
import { habitCoachPlanSchema, validateHabitCoachPlan } from "./ai/schemas";
import { summarizeActivityHistory } from "./ai/habitSummary";
```

Add routes before admin endpoints:

```ts
app.get("/api/ai/credits", async (c) => {
  const auth = await requireUser(c);
  if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

  const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
  return c.json({ balance });
});

app.get("/api/habit-coach/current", async (c) => {
  const auth = await requireUser(c);
  if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

  const { data: plan, error } = await auth.supabaseAdmin
    .from("habit_coach_plans")
    .select("*, habit_coach_plan_days(*)")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return c.json({ plan });
});

app.post("/api/habit-coach/generate", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const body = await c.req.json();
    const mode = body.mode === "renewal" ? "renewal" : "initial";
    const creditCost = mode === "renewal" ? 60 : 50;
    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const cycleSnapshot = body.cycleSnapshot || {};
    const previousSummary = {
      ...(body.previousSummary || {}),
      activity: summarizeActivityHistory(body.activityHistory || {}),
    };

    const ai = await callOpenRouterJson<any>({
      apiKey: c.env.OPENROUTER_API_KEY,
      model: c.env.OPENROUTER_FREE_MODEL || "qwen/qwen3-next-80b-a3b-instruct:free",
      fallbackModels: [c.env.OPENROUTER_PAID_MODEL || "openai/gpt-5-nano"],
      messages: buildHabitCoachMessages({
        nickname: body.nickname || "",
        mode,
        answers: body.answers || [],
        cycleSnapshot,
        previousSummary,
      }),
      responseSchemaName: "habit_coach_plan",
      responseSchema: habitCoachPlanSchema,
      maxCompletionTokens: 2200,
    });

    const result = validateHabitCoachPlan(ai.data);

    const { data: savedPlan, error: insertPlanError } = await auth.supabaseAdmin
      .from("habit_coach_plans")
      .insert({
        user_id: auth.user.id,
        week_start: body.weekStart,
        week_end: body.weekEnd,
        mode,
        status: "pending_charge",
        user_goal: body.userGoal || "habit sehat",
        user_constraints: { answers: body.answers || [] },
        cycle_snapshot: cycleSnapshot,
        previous_summary: previousSummary,
        coach_summary: result.coachSummary,
        ai_model: ai.model,
        credit_cost: creditCost,
      })
      .select()
      .single();

    if (insertPlanError) throw insertPlanError;

    const days = result.days.map((day: any, index: number) => ({
      plan_id: savedPlan.id,
      date_key: body.dateKeys[index],
      day_index: index + 1,
      focus: day.focus,
      tasks: day.tasks,
    }));

    const { error: insertDaysError } = await auth.supabaseAdmin
      .from("habit_coach_plan_days")
      .insert(days);

    if (insertDaysError) throw insertDaysError;

    const balanceAfter = await chargeAiCredits({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      amount: creditCost,
      feature: "habit_coach",
      reason: mode,
      referenceId: savedPlan.id,
      metadata: { model: ai.model, usage: ai.usage || null },
    });

    const { data: activatedPlan, error: activateError } = await auth.supabaseAdmin
      .from("habit_coach_plans")
      .update({ status: "active" })
      .eq("id", savedPlan.id)
      .select()
      .single();

    if (activateError) throw activateError;

    return c.json({
      plan: { ...activatedPlan, habit_coach_plan_days: days },
      balance: balanceAfter,
    });
  } catch (error: any) {
    console.error("[habit-coach/generate]", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat rencana habit." }, 500);
  }
});
```

- [ ] **Step 4: Typecheck**

```powershell
npm run lint
```

Expected: PASS. If TypeScript complains about local route object typing, add explicit `any` around Supabase result objects rather than weakening shared app types.

- [ ] **Step 5: Commit**

```powershell
git add backend/ai/prompts.ts backend/ai/habitSummary.ts backend/index.ts
git commit -m "feat: add habit coach api"
```

---

## Task 8: Habit Coach UI

**Files:**

- Create: `mobile-app/components/habits/HabitCoachCard.tsx`
- Create: `mobile-app/components/habits/HabitCoachSheet.tsx`
- Create: `mobile-app/components/habits/HabitPlanWeekView.tsx`
- Modify: `mobile-app/app/(tabs)/habits.tsx`
- Modify: `mobile-app/components/habits/AiRecommendationSection.tsx`

- [ ] **Step 1: Create Habit Coach card**

Create `mobile-app/components/habits/HabitCoachCard.tsx`:

```tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { HabitCoachPlan } from "../../src/lib/habitCoachTypes";

interface Props {
  plan: HabitCoachPlan | null;
  creditBalance: number | null;
  onOpenCoach: () => void;
}

export function HabitCoachCard({ plan, creditBalance, onOpenCoach }: Props) {
  const hasPlan = Boolean(plan);

  return (
    <View
      style={{
        backgroundColor: "#eef2ff",
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: "#dbeafe",
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              color: "#4f46e5",
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            Coach Habit
          </Text>
          <Text style={{ fontSize: 18, color: "#1e1b4b", fontWeight: "800", marginTop: 4 }}>
            {hasPlan ? "Rencana 7 harimu aktif" : "Buat rencana 7 hari"}
          </Text>
          <Text style={{ fontSize: 12, color: "#475569", lineHeight: 18, marginTop: 4 }}>
            {hasPlan
              ? plan!.coachSummary
              : "Jawab beberapa pertanyaan singkat, lalu coach membuat habit kecil yang bisa kamu ceklis setiap hari."}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "700" }}>
          {creditBalance == null ? "" : `${creditBalance} kredit`}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onOpenCoach}
        style={{
          backgroundColor: "#4f46e5",
          borderRadius: 16,
          paddingVertical: 13,
          alignItems: "center",
        }}
      >
        <Text
          style={{ color: "#fff", fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}
        >
          {hasPlan ? "Review Rencana" : "Mulai Coach"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 2: Create guided sheet**

Create `mobile-app/components/habits/HabitCoachSheet.tsx`:

```tsx
import React, { useState } from "react";
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { CoachQuestionAnswer, HabitCoachPlan } from "../../src/lib/habitCoachTypes";

const questions = [
  {
    id: "goal",
    question: "Minggu ini kamu mau fokus ke apa?",
    placeholder: "Contoh: promil aktif, tidur lebih rapi, lebih tenang saat TWW",
  },
  {
    id: "time",
    question: "Waktu realistis per hari berapa menit?",
    placeholder: "Contoh: 5-10 menit",
  },
  {
    id: "constraint",
    question: "Ada kendala yang perlu coach tahu?",
    placeholder: "Contoh: kerja padat, gampang lelah, kram, susah tidur",
  },
  {
    id: "intensity",
    question: "Mau target ringan, sedang, atau menantang?",
    placeholder: "Contoh: ringan dulu",
  },
];

interface Props {
  visible: boolean;
  mode: "initial" | "renewal";
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onGenerate: (answers: CoachQuestionAnswer[]) => Promise<void>;
}

export function HabitCoachSheet({ visible, mode, loading, error, onClose, onGenerate }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const canSubmit = questions.every((item) => answers[item.id]?.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            gap: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
            {mode === "renewal" ? "Review dan buat plan baru" : "Diskusi singkat dengan coach"}
          </Text>

          {questions.map((item) => (
            <View key={item.id} style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#4f46e5" }}>
                {item.question}
              </Text>
              <TextInput
                value={answers[item.id] || ""}
                onChangeText={(value) => setAnswers((prev) => ({ ...prev, [item.id]: value }))}
                placeholder={item.placeholder}
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 13,
                  color: "#111827",
                }}
              />
            </View>
          ))}

          {error && <Text style={{ color: "#dc2626", fontSize: 12 }}>{error}</Text>}

          <TouchableOpacity
            disabled={!canSubmit || loading}
            onPress={() =>
              onGenerate(
                questions.map((item) => ({
                  id: item.id,
                  question: item.question,
                  answer: answers[item.id].trim(),
                })),
              )
            }
            style={{
              backgroundColor: canSubmit ? "#4f46e5" : "#cbd5e1",
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                Gunakan {mode === "renewal" ? 60 : 50} kredit
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Create week preview**

Create `mobile-app/components/habits/HabitPlanWeekView.tsx`:

```tsx
import React from "react";
import { Text, View } from "react-native";
import type { HabitCoachPlan } from "../../src/lib/habitCoachTypes";

export function HabitPlanWeekView({ plan }: { plan: HabitCoachPlan }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>Rencana 7 Hari</Text>
      {plan.days.map((day) => (
        <View key={day.dateKey} style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#4f46e5" }}>
            Hari {day.dayIndex}: {day.focus}
          </Text>
          {day.tasks.map((task) => (
            <Text key={task.id} style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}>
              - {task.text}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Wire into `habits.tsx`**

In `mobile-app/app/(tabs)/habits.tsx`, add state for:

```ts
const [habitCoachPlan, setHabitCoachPlan] = useState<HabitCoachPlan | null>(null);
const [aiCreditBalance, setAiCreditBalance] = useState<number | null>(null);
const [coachOpen, setCoachOpen] = useState(false);
const [coachLoading, setCoachLoading] = useState(false);
const [coachError, setCoachError] = useState<string | null>(null);
```

Use coach tasks first:

```ts
const coachTasks = getPlanTasksForDate(habitCoachPlan, dateKey);
const currentDayData = activityHistory[dateKey] || {
  tasks: coachTasks.length > 0 ? coachTasks : fallbackTasks,
  symptoms: [],
};
```

Add a generate function:

```ts
const handleGenerateCoachPlan = async (answers: CoachQuestionAnswer[]) => {
  setCoachLoading(true);
  setCoachError(null);
  try {
    const weekStart = getLocalWeekStart(viewedDate);
    const weekEnd = getLocalWeekEnd(viewedDate);
    const dateKeys = Array.from({ length: 7 }, (_, index) =>
      format(addDays(weekStart, index), "yyyy-MM-dd"),
    );

    const json = await apiPostJson<{ plan: any; balance: number }>("/api/habit-coach/generate", {
      mode: habitCoachPlan ? "renewal" : "initial",
      answers,
      nickname: userNickname,
      userGoal: answers.find((answer) => answer.id === "goal")?.answer || "habit sehat",
      weekStart: format(weekStart, "yyyy-MM-dd"),
      weekEnd: format(weekEnd, "yyyy-MM-dd"),
      dateKeys,
      activityHistory,
      cycleSnapshot: { currentPhase },
      previousSummary: habitCoachPlan
        ? summarizeHabitPlanCompletion(habitCoachPlan, activityHistory)
        : null,
    });

    setHabitCoachPlan(mapApiHabitPlan(json.plan));
    setAiCreditBalance(json.balance);
    setCoachOpen(false);
  } catch (error: any) {
    setCoachError(error.message || "Gagal membuat rencana habit.");
  } finally {
    setCoachLoading(false);
  }
};
```

If `mapApiHabitPlan` is not yet defined, add it inside `habitCoachPlan.ts`.

- [ ] **Step 5: Demote old generic AI insight**

In `AiRecommendationSection`, hide it when an active Habit Coach plan exists. Keep it as a fallback only for users without coach plan until the new flow is stable.

- [ ] **Step 6: Typecheck**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Manual verification**

```powershell
npm run dev
```

Open Expo app, go to Habit tab, verify:

- No plan: Coach card shows "Buat rencana 7 hari".
- Generate with insufficient credits returns a friendly error.
- Generate success shows plan and today's checklist uses coach tasks.
- Toggling tasks persists in `activityHistory`.
- Review mode shows 60-credit button.

- [ ] **Step 8: Commit**

```powershell
git add mobile-app/app/(tabs)/habits.tsx mobile-app/components/habits/HabitCoachCard.tsx mobile-app/components/habits/HabitCoachSheet.tsx mobile-app/components/habits/HabitPlanWeekView.tsx mobile-app/components/habits/AiRecommendationSection.tsx
git commit -m "feat: add ai habit coach flow"
```

---

## Task 9: Backend Panduan Siklus Endpoint

**Files:**

- Create: `backend/ai/cycleGuideSummary.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Add server summary helper**

Create `backend/ai/cycleGuideSummary.ts`:

```ts
export function buildCycleGuideSnapshot(body: any) {
  return {
    currentPhase: body.currentPhase,
    cycleDay: body.cycleDay,
    daysToNextPeriod: body.daysToNextPeriod,
    fertileWindow: body.fertileWindow,
    ovulationDate: body.ovulationDate,
    nextPeriodDate: body.nextPeriodDate,
    cycleConfidence: body.cycleConfidence,
    periodConfidence: body.periodConfidence,
    lastPredictionDeltaDays: body.lastPredictionDeltaDays,
    guideLevel: body.guideLevel,
  };
}
```

- [ ] **Step 2: Add endpoint**

In `backend/index.ts`, add imports:

```ts
import { buildCycleGuideMessages } from "./ai/prompts";
import { cycleGuideSchema, validateCycleGuide } from "./ai/schemas";
import { buildCycleGuideSnapshot } from "./ai/cycleGuideSummary";
```

Add route:

```ts
app.post("/api/cycle-guide/generate", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const creditCost = 40;
    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const body = await c.req.json();
    const cycleSnapshot = buildCycleGuideSnapshot(body);
    const habitSnapshot = body.habitSnapshot || {};

    const ai = await callOpenRouterJson<any>({
      apiKey: c.env.OPENROUTER_API_KEY,
      model: c.env.OPENROUTER_FREE_MODEL || "qwen/qwen3-next-80b-a3b-instruct:free",
      fallbackModels: [c.env.OPENROUTER_PAID_MODEL || "openai/gpt-5-nano"],
      messages: buildCycleGuideMessages({
        nickname: body.nickname || "",
        guideLevel: body.guideLevel || "starter",
        cycleSnapshot,
        habitSnapshot,
      }),
      responseSchemaName: "cycle_guide",
      responseSchema: cycleGuideSchema,
      maxCompletionTokens: 1200,
    });

    const result = validateCycleGuide(ai.data);

    const { data: saved, error: saveError } = await auth.supabaseAdmin
      .from("cycle_guides")
      .insert({
        user_id: auth.user.id,
        generated_for_date: body.generatedForDate,
        guide_level: body.guideLevel || "starter",
        cycle_snapshot: cycleSnapshot,
        habit_snapshot: habitSnapshot,
        result,
        status: "pending_charge",
        ai_model: ai.model,
        credit_cost: creditCost,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    const balanceAfter = await chargeAiCredits({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      amount: creditCost,
      feature: "cycle_guide",
      reason: body.guideLevel || "starter",
      referenceId: saved.id,
      metadata: { model: ai.model, usage: ai.usage || null },
    });

    const { data: activatedGuide, error: activateError } = await auth.supabaseAdmin
      .from("cycle_guides")
      .update({ status: "active" })
      .eq("id", saved.id)
      .select()
      .single();

    if (activateError) throw activateError;

    return c.json({ guide: activatedGuide, result, balance: balanceAfter });
  } catch (error: any) {
    console.error("[cycle-guide/generate]", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat panduan siklus." }, 500);
  }
});
```

- [ ] **Step 3: Typecheck**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add backend/ai/cycleGuideSummary.ts backend/index.ts
git commit -m "feat: add cycle guide api"
```

---

## Task 10: Panduan Siklus UI

**Files:**

- Create: `mobile-app/components/calendar/CycleGuideCard.tsx`
- Create: `mobile-app/components/calendar/CycleGuideModal.tsx`
- Modify: `mobile-app/app/(tabs)/calendar.tsx`
- Modify: `mobile-app/components/calendar/AiReportModal.tsx`

- [ ] **Step 1: Create guide card**

Create `mobile-app/components/calendar/CycleGuideCard.tsx`:

```tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { CycleGuidePreview } from "../../src/lib/cycleGuideSummary";

interface Props {
  preview: CycleGuidePreview;
  onOpen: () => void;
}

export function CycleGuideCard({ preview, onOpen }: Props) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      style={{
        marginTop: 24,
        backgroundColor: "#fdf2f8",
        borderWidth: 1,
        borderColor: "#fbcfe8",
        borderRadius: 28,
        padding: 18,
        gap: 8,
      }}
    >
      <Text
        style={{ fontSize: 11, color: "#db2777", fontWeight: "800", textTransform: "uppercase" }}
      >
        Panduan Siklus
      </Text>
      <Text style={{ fontSize: 17, color: "#1f2937", fontWeight: "800" }}>{preview.title}</Text>
      <Text style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}>{preview.summary}</Text>
      <Text style={{ fontSize: 11, color: "#db2777", fontWeight: "700" }}>
        Akurasi: {preview.confidenceLabel}
      </Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Create guide modal**

Create `mobile-app/components/calendar/CycleGuideModal.tsx`:

```tsx
import React, { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { apiPostJson } from "../../src/lib/api";
import type { CycleGuidePreview } from "../../src/lib/cycleGuideSummary";

interface Props {
  visible: boolean;
  preview: CycleGuidePreview;
  payload: Record<string, unknown>;
  onClose: () => void;
  onOpenHabitCoach: () => void;
}

export function CycleGuideModal({ visible, preview, payload, onClose, onOpenHabitCoach }: Props) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiPostJson<any>("/api/cycle-guide/generate", payload);
      setResult(json.result);
    } catch (err: any) {
      setError(err.message || "Gagal membuat panduan personal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "86%",
            padding: 22,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#db2777",
                fontWeight: "800",
                textTransform: "uppercase",
              }}
            >
              Panduan Siklus
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>
              {preview.title}
            </Text>
            <Text style={{ fontSize: 13, color: "#475569", lineHeight: 20 }}>
              {preview.summary}
            </Text>

            {!result && (
              <TouchableOpacity
                onPress={generate}
                disabled={loading}
                style={{
                  backgroundColor: "#db2777",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Buat panduan personal - 40 kredit
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {error && <Text style={{ color: "#dc2626", fontSize: 12 }}>{error}</Text>}

            {result && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 14, color: "#111827", lineHeight: 21 }}>
                  {result.summary}
                </Text>
                {result.bodySignals?.map((item: string, index: number) => (
                  <Text key={index} style={{ fontSize: 13, color: "#475569", lineHeight: 20 }}>
                    - {item}
                  </Text>
                ))}
                <Text style={{ fontSize: 13, color: "#111827", fontWeight: "800" }}>
                  {result.focusThisWeek}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
                  {result.disclaimer}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={onOpenHabitCoach}
              style={{
                borderWidth: 1,
                borderColor: "#db2777",
                borderRadius: 16,
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#db2777", fontWeight: "800" }}>
                Sesuaikan habit minggu ini
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Wire into calendar**

In `mobile-app/app/(tabs)/calendar.tsx`, replace the AI Cycle Analysis banner with `CycleGuideCard`.

Compute preview:

```ts
const preview = buildCycleGuidePreview({
  currentPhase,
  cycleDay,
  daysToNextPeriod,
  cycleConfidence,
  periodConfidence,
  hasManualLogs,
  activityHistory,
  activeHabitPlanSummary: null,
});
```

The required context values already exist in `CycleContext`; if they are not destructured in `calendar.tsx`, add them from `useCycle()`.

Payload for AI:

```ts
const cycleGuidePayload = {
  generatedForDate: format(new Date(), "yyyy-MM-dd"),
  guideLevel: preview.level,
  currentPhase,
  cycleDay,
  daysToNextPeriod,
  fertileWindow: {
    start: fertileWindowStart ? format(fertileWindowStart, "yyyy-MM-dd") : "",
    end: fertileWindowEnd ? format(fertileWindowEnd, "yyyy-MM-dd") : "",
  },
  ovulationDate: ovulationDate ? format(ovulationDate, "yyyy-MM-dd") : "",
  nextPeriodDate: nextPeriodDate ? format(nextPeriodDate, "yyyy-MM-dd") : "",
  cycleConfidence,
  periodConfidence,
  lastPredictionDeltaDays,
  habitSnapshot: {},
};
```

- [ ] **Step 4: Deprecate old `AiReportModal` entry**

Keep `AiReportModal.tsx` in place until the new guide is verified, but remove the visible entry point from Calendar. Do not delete the old endpoint yet.

- [ ] **Step 5: Typecheck**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Manual verification**

```powershell
npm run dev
```

Verify:

- New user sees "Panduan awal siklusmu".
- User with logs sees "Panduan minggu ini" or "Insight personal siklusmu".
- Modal explains cycle and does not create habit checklists.
- CTA opens or navigates to Habit Coach.

- [ ] **Step 7: Commit**

```powershell
git add mobile-app/app/(tabs)/calendar.tsx mobile-app/components/calendar/CycleGuideCard.tsx mobile-app/components/calendar/CycleGuideModal.tsx mobile-app/components/calendar/AiReportModal.tsx
git commit -m "feat: add panduan siklus flow"
```

---

## Task 11: Credit Grants For Premium Buyers

**Files:**

- Modify: `backend/index.ts`

- [ ] **Step 1: Grant 500 credits after premium registration succeeds**

In the free-bypass and paid webhook success flows, after the Supabase user exists and profile exists, call:

```ts
await supabaseAdmin.rpc("grant_ai_credits", {
  p_user_id: userId,
  p_amount: 500,
  p_feature: "premium_bonus",
  p_reason: "premium_initial_bonus",
  p_reference_id: session?.id || null,
  p_metadata: { source: "premium_lifetime" },
});
```

Use the actual created user id from each flow:

- Free bypass: `authData.user?.id`
- Paid webhook: the user id returned by `createUser` or resolved existing user.

- [ ] **Step 2: Make grant idempotent**

Before granting, query the ledger:

```ts
const { data: existingBonus } = await supabaseAdmin
  .from("ai_credit_ledger")
  .select("id")
  .eq("user_id", userId)
  .eq("feature", "premium_bonus")
  .eq("reason", "premium_initial_bonus")
  .maybeSingle();

if (!existingBonus) {
  await supabaseAdmin.rpc("grant_ai_credits", {
    p_user_id: userId,
    p_amount: 500,
    p_feature: "premium_bonus",
    p_reason: "premium_initial_bonus",
    p_reference_id: session?.id || null,
    p_metadata: { source: "premium_lifetime" },
  });
}
```

- [ ] **Step 3: Typecheck**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add backend/index.ts
git commit -m "feat: grant premium ai credit bonus"
```

---

## Task 12: Full Verification

**Files:**

- No new files unless fixes are needed.

- [ ] **Step 1: Run focused logic tests**

```powershell
npx tsx mobile-app/src/lib/habitCoachPlan.test.ts
npx tsx mobile-app/src/lib/cycleGuideSummary.test.ts
npx tsx mobile-app/src/lib/cycleUtils.test.ts
npx tsx mobile-app/src/lib/activityHistorySync.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run backend typecheck**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run mobile web build**

```powershell
Set-Location mobile-app
npm run build:web
```

Expected: Expo web export completes and `mobile-app/dist` is generated.

- [ ] **Step 4: Manual happy-path test**

Use a test user with 500 credits.

1. Open Habit tab.
2. Generate initial Habit Coach plan.
3. Confirm balance decreases by 50 only after plan is visible.
4. Complete one habit.
5. Open Calendar.
6. Open Panduan Siklus.
7. Generate personal guide.
8. Confirm balance decreases by 40 only after guide is visible.

- [ ] **Step 5: Manual failure-path test**

Use a test user with 0 credits.

1. Try Habit Coach generation.
2. Confirm friendly insufficient-credit error.
3. Confirm no plan is saved.
4. Try Panduan Siklus AI guide.
5. Confirm friendly insufficient-credit error.
6. Confirm no cycle guide is saved.

- [ ] **Step 6: Commit verification fixes**

If fixes are needed:

```powershell
git add <changed-files>
git commit -m "fix: harden ai habit and cycle guide flows"
```

---

## Self-Review

- Spec coverage: Habit Coach, Panduan Siklus, distinct AI boundaries, credit prices, premium bonus, post-save charging, and OpenRouter migration are covered.
- Placeholder scan: No `TBD`, `TODO`, or deferred feature holes remain in the task list.
- Type consistency: Mobile uses `HabitCoachPlan`, `HabitCoachTask`, `CycleGuidePreview`; backend uses matching payload shapes and stores DB rows with snake_case columns.
- Scope check: The plan is one integrated feature set because Panduan Siklus depends on Habit Coach summaries and shared AI credit infrastructure. If execution feels too large, implement Tasks 1-8 first as Habit Coach MVP, then Tasks 9-10 as Panduan Siklus.
