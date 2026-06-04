import {
  buildHabitCoachDayTasks,
  type HabitCoachCycleDay,
  type HabitCoachTask,
} from "./habitCoachFoundation";

export interface HabitCoachActiveOverlap {
  id?: string | null;
  week_start?: string | null;
  weekStart?: string | null;
  week_end?: string | null;
  weekEnd?: string | null;
}

export interface HabitCoachAiDayForSave {
  focus: string;
  tasks: HabitCoachTask[];
}

export interface HabitCoachDayPayload {
  plan_id?: string;
  date_key: string;
  day_index: number;
  focus: string;
  tasks: HabitCoachTask[];
}

export function buildHabitCoachActiveOverlapConflict(input: {
  activeOverlaps: HabitCoachActiveOverlap[];
  replaceActivePlan: boolean;
  fallbackWeekEnd: string;
}) {
  if (input.replaceActivePlan || input.activeOverlaps.length === 0) {
    return null;
  }

  const latestOverlap = [...input.activeOverlaps].sort((left, right) =>
    getWeekEnd(right).localeCompare(getWeekEnd(left)),
  )[0];
  const activeUntil = getWeekEnd(latestOverlap) || input.fallbackWeekEnd;
  const message =
    `Rencana habit aktif masih berlaku sampai ${activeUntil}. ` +
    "Kalau kamu melanjutkan, Siklusio akan membangun ulang rencana mulai hari ini sampai 7 hari ke depan.";

  return {
    code: "ACTIVE_PLAN_OVERLAP",
    error: message,
    message,
    activeUntil,
    planId: latestOverlap?.id || null,
  };
}

export function buildHabitCoachPlanDayPayloads(input: {
  dateKeys: string[];
  cycleDays: HabitCoachCycleDay[];
  aiDays: HabitCoachAiDayForSave[];
}): HabitCoachDayPayload[] {
  const cycleDaysByDate = new Map(input.cycleDays.map((cycleDay) => [cycleDay.dateKey, cycleDay]));

  return input.aiDays.map((day, index) => {
    const dateKey = input.dateKeys[index];
    return {
      date_key: dateKey,
      day_index: index + 1,
      focus: day.focus,
      tasks: buildHabitCoachDayTasks(
        day.tasks,
        cycleDaysByDate.get(dateKey) || input.cycleDays[index],
      ),
    };
  });
}

export async function saveHabitCoachPlanWithCharge(input: {
  supabaseAdmin: any;
  userId: string;
  replaceActivePlan: boolean;
  activeOverlaps: HabitCoachActiveOverlap[];
  dateKeys: string[];
  cycleDays: HabitCoachCycleDay[];
  aiDays: HabitCoachAiDayForSave[];
  planInsert: Record<string, unknown>;
  charge: (referenceId: string) => Promise<number>;
}) {
  const dayPayloads = buildHabitCoachPlanDayPayloads({
    dateKeys: input.dateKeys,
    cycleDays: input.cycleDays,
    aiDays: input.aiDays,
  });

  let savedPlan: any = null;
  let replacedPlansWereArchived = false;

  try {
    const { data: insertedPlan, error: insertPlanError } = await input.supabaseAdmin
      .from("habit_coach_plans")
      .insert(input.planInsert)
      .select()
      .single();

    if (insertPlanError) throw insertPlanError;
    savedPlan = insertedPlan;

    const days = dayPayloads.map((day) => ({
      ...day,
      plan_id: savedPlan.id,
    }));

    const { error: insertDaysError } = await input.supabaseAdmin
      .from("habit_coach_plan_days")
      .insert(days);

    if (insertDaysError) throw insertDaysError;

    const overlapIds = getOverlapIds(input.activeOverlaps);
    if (input.replaceActivePlan && overlapIds.length > 0) {
      await removeArchivedPlanConflicts({
        supabaseAdmin: input.supabaseAdmin,
        userId: input.userId,
        activeOverlaps: input.activeOverlaps,
      });

      const { error: archiveError } = await input.supabaseAdmin
        .from("habit_coach_plans")
        .update({ status: "archived" })
        .eq("user_id", input.userId)
        .eq("status", "active")
        .in("id", overlapIds);

      if (archiveError) throw archiveError;
      replacedPlansWereArchived = true;
    }

    const { data: activatedPlan, error: activateError } = await input.supabaseAdmin
      .from("habit_coach_plans")
      .update({ status: "active" })
      .eq("id", savedPlan.id)
      .select()
      .single();

    if (activateError) throw activateError;

    const balance = await input.charge(String(savedPlan.id));

    return {
      plan: { ...activatedPlan, habit_coach_plan_days: days },
      balance,
    };
  } catch (error) {
    if (savedPlan?.id) {
      await deletePlanBestEffort(input.supabaseAdmin, String(savedPlan.id));
    }

    if (replacedPlansWereArchived) {
      await restoreActivePlansBestEffort({
        supabaseAdmin: input.supabaseAdmin,
        userId: input.userId,
        activeOverlaps: input.activeOverlaps,
      });
    }

    throw error;
  }
}

function getWeekEnd(plan: HabitCoachActiveOverlap) {
  return String(plan?.week_end || plan?.weekEnd || "");
}

function getWeekStart(plan: HabitCoachActiveOverlap) {
  return String(plan?.week_start || plan?.weekStart || "");
}

function getOverlapIds(activeOverlaps: HabitCoachActiveOverlap[]) {
  return activeOverlaps.map((plan) => plan?.id).filter(Boolean) as string[];
}

async function removeArchivedPlanConflicts(input: {
  supabaseAdmin: any;
  userId: string;
  activeOverlaps: HabitCoachActiveOverlap[];
}) {
  const weekStarts = [...new Set(input.activeOverlaps.map(getWeekStart).filter(Boolean))];
  if (weekStarts.length === 0) return;

  const { error } = await input.supabaseAdmin
    .from("habit_coach_plans")
    .delete()
    .eq("user_id", input.userId)
    .eq("status", "archived")
    .in("week_start", weekStarts);

  if (error) throw error;
}

async function deletePlanBestEffort(supabaseAdmin: any, planId: string) {
  try {
    const { error } = await supabaseAdmin.from("habit_coach_plans").delete().eq("id", planId);

    if (error) throw error;
  } catch (error) {
    console.error("[habit-coach/cleanup-new-plan]", error);
  }
}

async function restoreActivePlansBestEffort(input: {
  supabaseAdmin: any;
  userId: string;
  activeOverlaps: HabitCoachActiveOverlap[];
}) {
  const overlapIds = getOverlapIds(input.activeOverlaps);
  if (overlapIds.length === 0) return;

  try {
    const { error } = await input.supabaseAdmin
      .from("habit_coach_plans")
      .update({ status: "active" })
      .eq("user_id", input.userId)
      .eq("status", "archived")
      .in("id", overlapIds);

    if (error) throw error;
  } catch (error) {
    console.error("[habit-coach/restore-active-plans]", error);
  }
}
