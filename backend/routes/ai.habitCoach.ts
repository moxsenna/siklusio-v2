import { Hono } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middleware/auth";
import { getAiCreditBalance, chargeAiCredits } from "../services/aiCreditLedger";
import { isDateKey, isValidHabitCoachWindow, shouldReplaceActivePlan } from "../ai/habitCoachWindow";
import { buildHabitCoachActiveOverlapConflict, saveHabitCoachPlanWithCharge } from "../ai/habitCoachPlanLifecycle";
import { summarizeActivityHistory } from "../ai/habitSummary";
import { resolveOpenRouterModels } from "../ai/modelPolicy";
import { callOpenRouterJson } from "../ai/openRouter";
import { buildHabitCoachMessages } from "../ai/prompts";
import { validateHabitCoachPlan, habitCoachPlanSchema } from "../schemas/requestSchemas";
import { type HabitCoachCycleDay } from "../ai/habitCoachFoundation";

const router = new Hono<{ Bindings: Env }>();

const normalizeHabitCoachCycleDays = (
  value: unknown,
  dateKeys: string[],
  cycleSnapshot: Record<string, unknown>
): HabitCoachCycleDay[] => {
  const rawDays = Array.isArray(value) ? value : [];
  const rawByDate = new Map<string, any>();

  rawDays.forEach((raw) => {
    if (raw && typeof raw === "object" && isDateKey((raw as any).dateKey)) {
      rawByDate.set((raw as any).dateKey, raw);
    }
  });

  return dateKeys.map((dateKey, index) => {
    const raw = rawByDate.get(dateKey) || rawDays[index] || {};
    const phase =
      typeof raw?.phase === "string"
        ? raw.phase
        : typeof cycleSnapshot.currentPhase === "string"
          ? cycleSnapshot.currentPhase
          : "";
    const displayPhase = typeof raw?.displayPhase === "string" ? raw.displayPhase : phase;
    const cycleDay = Number.isFinite(Number(raw?.cycleDay)) ? Number(raw.cycleDay) : null;

    return {
      dateKey,
      dayIndex: typeof raw?.dayIndex === "number" ? raw.dayIndex : index + 1,
      phase,
      displayPhase,
      cycleDay,
      isManualPeriod: raw?.isManualPeriod === true,
    };
  });
};

router.get("/api/habit-coach/current", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const date = c.req.query("date");
    const hasDateFilter = isDateKey(date);
    if (date && !hasDateFilter) {
      return c.json({ error: "Parameter date tidak valid." }, 400);
    }

    let planQuery = auth.supabaseAdmin
      .from("habit_coach_plans")
      .select("*, habit_coach_plan_days(*)")
      .eq("user_id", auth.user.id)
      .eq("status", "active");

    if (hasDateFilter && date) {
      planQuery = planQuery
        .lte("week_start", date)
        .gte("week_end", date);
    }

    const { data: plan, error } = await planQuery
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return c.json({ plan });
  } catch (error: any) {
    console.error("[habit-coach/current]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil rencana habit." }, 500);
  }
});

router.post("/api/habit-coach/generate", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const body = await c.req.json();
    const dateKeys = Array.isArray(body.dateKeys) ? body.dateKeys : [];
    if (
      !isValidHabitCoachWindow({
        weekStart: body.weekStart,
        weekEnd: body.weekEnd,
        dateKeys,
      })
    ) {
      return c.json({ error: "Data minggu habit tidak valid." }, 400);
    }

    const mode = body.mode === "renewal" ? "renewal" : "initial";
    const creditCost = mode === "renewal" ? 60 : 50;
    const replaceActivePlan = shouldReplaceActivePlan(body.replaceActivePlan);

    const { data: overlappingActivePlans, error: existingError } = await auth.supabaseAdmin
      .from("habit_coach_plans")
      .select("id, week_start, week_end")
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .lte("week_start", body.weekEnd)
      .gte("week_end", body.weekStart)
      .order("week_end", { ascending: false });

    if (existingError) throw existingError;
    const activeOverlaps = Array.isArray(overlappingActivePlans) ? overlappingActivePlans : [];
    const overlapConflict = buildHabitCoachActiveOverlapConflict({
      activeOverlaps,
      replaceActivePlan,
      fallbackWeekEnd: body.weekEnd,
    });
    if (overlapConflict) {
      return c.json(overlapConflict, 409);
    }

    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const answers = Array.isArray(body.answers)
      ? body.answers.map((answer: any) => ({
          question: String(answer?.question || ""),
          answer: String(answer?.answer || ""),
        }))
      : [];
    const cycleSnapshot = body.cycleSnapshot || {};
    const cycleDays = normalizeHabitCoachCycleDays(body.cycleDays, dateKeys, cycleSnapshot);
    const previousSummary = {
      ...(body.previousSummary || {}),
      activity: summarizeActivityHistory(body.activityHistory || {}),
    };

    const modelSelection = resolveOpenRouterModels({
      policy: "paid",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
      paidModel: c.env.OPENROUTER_PAID_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey: c.env.OPENROUTER_API_KEY,
      ...modelSelection,
      messages: buildHabitCoachMessages({
        nickname: body.nickname || "",
        mode,
        answers,
        cycleSnapshot,
        cycleDays,
        previousSummary,
      }),
      responseSchemaName: "habit_coach_plan",
      responseSchema: habitCoachPlanSchema,
      maxCompletionTokens: 2200,
    });

    const result = validateHabitCoachPlan(ai.data);

    const { plan, balance: balanceAfter } = await saveHabitCoachPlanWithCharge({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      replaceActivePlan,
      activeOverlaps,
      dateKeys,
      cycleDays,
      aiDays: result.days,
      planInsert: {
        user_id: auth.user.id,
        week_start: body.weekStart,
        week_end: body.weekEnd,
        mode,
        status: "pending_charge",
        user_goal: body.userGoal || "habit sehat",
        user_constraints: { answers },
        cycle_snapshot: cycleSnapshot,
        previous_summary: previousSummary,
        coach_summary: result.coachSummary,
        ai_model: ai.model,
        credit_cost: creditCost,
      },
      charge: (referenceId) =>
        chargeAiCredits({
          supabaseAdmin: auth.supabaseAdmin,
          userId: auth.user.id,
          amount: creditCost,
          feature: "habit_coach",
          reason: mode,
          referenceId,
          metadata: { model: ai.model, usage: ai.usage || null },
        }),
    });

    return c.json({
      plan,
      balance: balanceAfter,
    });
  } catch (error: any) {
    console.error("[habit-coach/generate]", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat rencana habit." }, 500);
  }
});

export default router;
