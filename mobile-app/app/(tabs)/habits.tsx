import React, { useEffect, useState, useMemo, useTransition } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { addDays, differenceInDays, format, startOfDay } from "date-fns";
import { useCycle } from "@/src/context/CycleContext";
import { HeaderProfileButton } from "@/src/shared/components/HeaderProfileButton";
import { analytics } from "@/src/lib/analytics";
import { useTodayKey } from "@/src/hooks/useTodayKey";
import { stampDailyRecord } from "@/src/lib/activityHistorySync";
import { ApiError, apiGetJson, apiPostJson } from "@/src/lib/api";
import { parseLocalDate } from "@/src/lib/dateUtils";
import {
  getPlanTasksForDate,
  mergeCoachTasksWithSavedState,
  mapApiHabitPlan,
  summarizeHabitPlanCompletion,
} from "@/src/lib/habitCoachPlan";
import {
  buildHabitCoachCycleDays,
  buildSevenDayPlanWindow,
  getPlanDateOffsetBounds,
  getPlanDayNumber,
  isFuturePlanDate,
} from "@/src/lib/habitCoachFlow";
import type { CoachQuestionAnswer, HabitCoachPlan } from "@/src/lib/habitCoachTypes";

import { AiRecommendationSection } from "@/src/features/habits/AiRecommendationSection";
import { HabitCoachCard } from "@/src/features/habits/HabitCoachCard";
import { HabitCoachSheet } from "@/src/features/habits/HabitCoachSheet";
import { HistoryView } from "@/src/features/habits/HistoryView";
import { TodayRecipesCard } from "@/src/features/habits/TodayRecipesCard";
import { TodayRecipesModal } from "@/src/features/habits/TodayRecipesModal";

// Error boundary wrapper untuk HistoryView yang crash di native
class HistoryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 16, alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
            Grafik histori tidak tersedia di perangkat ini.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: "#fce7f3",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ec4899" }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function HistoryViewSafe(props: any) {
  return (
    <HistoryErrorBoundary>
      <HistoryView {...props} />
    </HistoryErrorBoundary>
  );
}

export default function HabitsScreen() {
  const {
    currentPhase,
    nextPeriodDate,
    activityHistory,
    setActivityHistory,
    userNickname,
    getDayInfo,
  } = useCycle();
  const [, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"daily" | "history">("daily");
  const [historyFilter, setHistoryFilter] = useState<7 | 14 | 30>(7);
  const [habitCoachPlan, setHabitCoachPlan] = useState<HabitCoachPlan | null>(null);
  const [aiCreditBalance, setAiCreditBalance] = useState<number | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachFetching, setCoachFetching] = useState(false);
  const [replaceActivePlan, setReplaceActivePlan] = useState(false);
  const [replacementWarning, setReplacementWarning] = useState<{
    activeUntil?: string | null;
    message?: string | null;
  } | null>(null);

  const [viewedDateOffset, setViewedDateOffset] = useState(0); // 0 = today, positive values are future plan days
  const todayDateKey = useTodayKey();
  const todayDate = useMemo(() => parseLocalDate(todayDateKey), [todayDateKey]);
  const todayCycleInfo = useMemo(() => getDayInfo(todayDate), [getDayInfo, todayDate]);
  const effectiveCurrentPhase = todayCycleInfo.phase || currentPhase;
  const effectiveCycleDay = todayCycleInfo.cycleDay;
  const effectiveDaysToNextPeriod = differenceInDays(
    startOfDay(nextPeriodDate),
    startOfDay(todayDate),
  );

  const viewedDate = useMemo(() => {
    return addDays(startOfDay(todayDate), viewedDateOffset);
  }, [todayDate, viewedDateOffset]);

  const dateString = useMemo(() => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${days[viewedDate.getDay()]}, ${viewedDate.getDate()} ${months[viewedDate.getMonth()]}`;
  }, [viewedDate]);

  const dateKey = format(viewedDate, "yyyy-MM-dd");

  useEffect(() => {
    let mounted = true;
    setCoachFetching(true);

    Promise.all([
      apiGetJson<{ plan: any | null }>(`/api/habit-coach/current?date=${todayDateKey}`),
      apiGetJson<{ balance: number }>("/api/ai/credits"),
    ])
      .then(([planResponse, creditResponse]) => {
        if (!mounted) return;
        setHabitCoachPlan(planResponse.plan ? mapApiHabitPlan(planResponse.plan) : null);
        setAiCreditBalance(creditResponse.balance);
      })
      .catch((error: any) => {
        console.warn("[Habits] Gagal mengambil Habit Coach:", error?.message || error);
      })
      .finally(() => {
        if (mounted) setCoachFetching(false);
      });

    return () => {
      mounted = false;
    };
  }, [todayDateKey]);

  // Dynamic Tasks Based on Phase
  const fallbackTasks = useMemo(() => {
    const baseTasks = [
      { id: 1, text: "Minum Air (2L)", emoji: "💧", done: false },
      { id: 2, text: "Asam Folat", emoji: "💊", done: false },
    ];

    if (effectiveCurrentPhase === "Menstrual") {
      baseTasks.push({ id: 3, text: "Kompres Hangat", emoji: "🌡️", done: false });
      baseTasks.push({ id: 4, text: "Istirahat Cukup", emoji: "🛌", done: false });
    } else if (effectiveCurrentPhase === "Ovulasi") {
      baseTasks.push({ id: 3, text: "Berhubungan Intim", emoji: "💖", done: false });
      baseTasks.push({ id: 4, text: "Olahraga Ringan", emoji: "🧘‍♀️", done: false });
    } else {
      baseTasks.push({ id: 3, text: "Nutrisi Susu Promil", emoji: "🥛", done: false });
      baseTasks.push({ id: 4, text: "Jalan Santai 15 Menit", emoji: "🚶‍♀️", done: false });
    }

    return baseTasks;
  }, [effectiveCurrentPhase]);

  const activeHabitCoachPlan = useMemo(
    () => (getPlanDayNumber(habitCoachPlan, todayDateKey) ? habitCoachPlan : null),
    [habitCoachPlan, todayDateKey],
  );
  const coachPlanOffsetBounds = useMemo(
    () => getPlanDateOffsetBounds(activeHabitCoachPlan, todayDateKey),
    [activeHabitCoachPlan, todayDateKey],
  );
  const dateOffsetBounds = useMemo(
    () => ({
      minOffset: -60,
      maxOffset: Math.max(0, coachPlanOffsetBounds.maxOffset),
    }),
    [coachPlanOffsetBounds.maxOffset],
  );

  useEffect(() => {
    setViewedDateOffset((current) =>
      Math.min(Math.max(current, dateOffsetBounds.minOffset), dateOffsetBounds.maxOffset),
    );
  }, [dateOffsetBounds.minOffset, dateOffsetBounds.maxOffset]);

  const coachTasks = useMemo(
    () => getPlanTasksForDate(activeHabitCoachPlan, dateKey),
    [activeHabitCoachPlan, dateKey],
  );
  const todayCoachTasks = useMemo(
    () => getPlanTasksForDate(activeHabitCoachPlan, todayDateKey),
    [activeHabitCoachPlan, todayDateKey],
  );
  const todayPlanFocus = useMemo(
    () => activeHabitCoachPlan?.days.find((day) => day.dateKey === todayDateKey)?.focus || null,
    [activeHabitCoachPlan, todayDateKey],
  );
  const selectedPlanDayNumber = useMemo(
    () => getPlanDayNumber(activeHabitCoachPlan, dateKey),
    [activeHabitCoachPlan, dateKey],
  );
  const todayPlanDayNumber = useMemo(
    () => getPlanDayNumber(activeHabitCoachPlan, todayDateKey),
    [activeHabitCoachPlan, todayDateKey],
  );
  const isFutureDate = isFuturePlanDate(dateKey, todayDateKey);
  const savedDayData = activityHistory[dateKey];
  const mergedCoachTasks = useMemo(
    () => mergeCoachTasksWithSavedState(coachTasks, savedDayData?.tasks),
    [coachTasks, savedDayData?.tasks],
  );
  const currentDayData = {
    ...(savedDayData || {}),
    tasks: coachTasks.length > 0 ? mergedCoachTasks : [],
    symptoms: savedDayData?.symptoms || [],
  };
  const tasks = currentDayData.tasks;
  const symptoms = currentDayData.symptoms || [];

  const updateCurrentDay = (newData: Partial<typeof currentDayData>) => {
    setActivityHistory((prev) => ({
      ...prev,
      [dateKey]: stampDailyRecord({
        ...currentDayData,
        ...newData,
      }),
    }));
  };

  const toggleTask = (id: number) => {
    if (isFutureDate) return;

    startTransition(() => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        const nextState = !task.done;
        if (nextState) {
          analytics.logEvent("habit_completed", {
            habit_name: task.text,
            phase: effectiveCurrentPhase,
          });
        }
      }
      updateCurrentDay({
        tasks: tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      });
    });
  };

  const toggleSymptom = (id: string) => {
    if (isFutureDate) return;

    startTransition(() => {
      const isAdding = !symptoms.includes(id);
      if (isAdding) {
        analytics.logEvent("symptom_logged", {
          symptom_id: id,
          phase: effectiveCurrentPhase,
        });
      }
      if (symptoms.includes(id)) {
        updateCurrentDay({ symptoms: symptoms.filter((s) => s !== id) });
      } else {
        updateCurrentDay({ symptoms: [...symptoms, id] });
      }
    });
  };

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

  const handleGenerateCoachPlan = async (answers: CoachQuestionAnswer[]) => {
    setCoachLoading(true);
    setCoachError(null);

    try {
      const mode = activeHabitCoachPlan ? "renewal" : "initial";
      const planWindow = buildSevenDayPlanWindow(todayDate);
      const cycleDays = buildHabitCoachCycleDays(planWindow.dateKeys, getDayInfo);
      const previousSummary = habitCoachPlan
        ? summarizeHabitPlanCompletion(habitCoachPlan, activityHistory)
        : null;

      const json = await apiPostJson<{ plan: any; balance: number }>("/api/habit-coach/generate", {
        mode,
        answers,
        nickname: userNickname,
        userGoal:
          answers.find((answer) => answer.id === "goal" || answer.id === "next_focus")?.answer ||
          "habit sehat",
        weekStart: planWindow.weekStart,
        weekEnd: planWindow.weekEnd,
        dateKeys: planWindow.dateKeys,
        activityHistory,
        cycleSnapshot: { currentPhase: effectiveCurrentPhase, cycleDays },
        cycleDays,
        ...(previousSummary ? { previousSummary } : {}),
        replaceActivePlan,
      });

      const refreshed = await apiGetJson<{ plan: any | null }>(
        `/api/habit-coach/current?date=${todayDateKey}`,
      );
      setHabitCoachPlan(
        refreshed.plan ? mapApiHabitPlan(refreshed.plan) : mapApiHabitPlan(json.plan),
      );
      setAiCreditBalance(json.balance);
      setViewedDateOffset(0);
      setReplaceActivePlan(false);
      setReplacementWarning(null);
      setCoachOpen(false);
    } catch (error: any) {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === "ACTIVE_PLAN_OVERLAP"
      ) {
        const payload = (error.payload || {}) as {
          activeUntil?: string | null;
          message?: string | null;
        };

        setReplacementWarning({
          activeUntil: payload.activeUntil,
          message:
            payload.message ||
            `Kamu masih punya plan sampai ${payload.activeUntil || "-"}. Jika lanjut, coach akan membangun ulang plan dari hari ini sampai 7 hari ke depan.`,
        });
        setReplaceActivePlan(true);
        setCoachOpen(true);
        return;
      }

      const message = error?.message || "Gagal membuat rencana habit.";
      setCoachError(message);
      if (Platform.OS !== "web") {
        Alert.alert("Habit Coach", message);
      }
    } finally {
      setCoachLoading(false);
    }
  };

  const completed = tasks.filter((t) => t.done).length;
  const percent = Math.round((completed / tasks.length) * 100) || 0;

  const getMotivationalMessage = (percent: number) => {
    if (!activeHabitCoachPlan)
      return "Generate plan 7 hari dulu agar target harian dari coach muncul di sini.";
    if (isFutureDate) return "Ini preview plan. Checkbox baru aktif saat tanggalnya tiba.";
    if (percent === 100)
      return `Luar biasa, ${userNickname}! Semua target hari ini selesai. Bangga banget! 💕`;
    if (percent >= 50) return `Keren! Separuh jalan terlewati, semangat terus ya! ✨`;
    if (percent > 0)
      return `Awal yang bagus, ${userNickname}. Yuk, pelan-pelan selesaikan sisanya! 🌟`;
    return `Halo ${userNickname}! Yuk mulai hari ini dengan senyuman dan semangat! 😊`;
  };

  const SYMPTOMS_LIST = [
    { id: "cramps", emoji: "😣", label: "Kram Perut" },
    { id: "headache", emoji: "🤕", label: "Sakit Kepala" },
    { id: "fatigue", emoji: "😴", label: "Kelelahan" },
    { id: "mood", emoji: "😠", label: "Mood Swing" },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: Platform.OS === "web" ? "100%" : undefined }}
      className="bg-background"
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        {/* Header */}
        <View className="mb-6 pt-4 flex-row justify-between items-end border-b border-primary/20 pb-4">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-on-background">Halo, {userNickname}</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">
              Gimana kabarmu hari ini?
            </Text>
          </View>
          <HeaderProfileButton />
        </View>

        {/* Tab Toggle Daily vs History */}
        <View className="flex-row bg-surface-variant p-1 rounded-2xl mb-6 shadow-inner">
          <TouchableOpacity
            onPress={() => startTransition(() => setViewMode("daily"))}
            className={`flex-1 py-3 rounded-xl items-center ${
              viewMode === "daily" ? "bg-surface shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                viewMode === "daily" ? "text-primary" : "text-on-surface-variant/70"
              }`}
            >
              Harian
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => startTransition(() => setViewMode("history"))}
            className={`flex-1 py-3 rounded-xl items-center ${
              viewMode === "history" ? "bg-surface shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                viewMode === "history" ? "text-primary" : "text-on-surface-variant/70"
              }`}
            >
              📊 Histori
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === "daily" ? (
          <View className="space-y-6">
            {/* Date Switcher */}
            <View className="flex-row justify-between items-center bg-surface px-4 py-3 rounded-2xl border border-outline-variant shadow-sm mb-4">
              <TouchableOpacity
                onPress={handlePrevDay}
                disabled={viewedDateOffset <= dateOffsetBounds.minOffset}
                className="w-9 h-9 rounded-full items-center justify-center bg-surface-variant"
              >
                <Text
                  className={`text-xl font-bold ${viewedDateOffset <= dateOffsetBounds.minOffset ? "opacity-30" : "text-primary"}`}
                >
                  ←
                </Text>
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Tanggal Fokus
                </Text>
                <Text className="text-sm font-bold text-on-surface mt-1">
                  {viewedDateOffset === 0 ? "Hari ini" : dateString}
                </Text>
                {selectedPlanDayNumber && (
                  <Text className="text-[10px] font-bold text-primary mt-1">
                    Hari {selectedPlanDayNumber} dari 7
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleNextDay}
                disabled={viewedDateOffset >= dateOffsetBounds.maxOffset}
                className="w-9 h-9 rounded-full items-center justify-center bg-surface-variant"
              >
                <Text
                  className={`text-xl font-bold ${viewedDateOffset >= dateOffsetBounds.maxOffset ? "opacity-30" : "text-primary"}`}
                >
                  →
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <HabitCoachCard
                plan={activeHabitCoachPlan}
                balance={aiCreditBalance}
                loading={coachFetching}
                todayFocus={todayPlanFocus}
                todayTaskCount={todayCoachTasks.length}
                todayDayNumber={todayPlanDayNumber}
                onOpen={() => {
                  setCoachError(null);
                  setReplacementWarning(null);
                  setReplaceActivePlan(false);
                  setCoachOpen(true);
                }}
              />
            </View>

            <View className="mb-6">
              <TodayRecipesCard
                currentPhase={effectiveCurrentPhase}
                balance={aiCreditBalance}
                onOpen={() => setRecipesOpen(true)}
              />
            </View>

            {/* Progress Header */}
            <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant relative overflow-hidden mb-6">
              <View className="flex-row items-center justify-between z-10">
                <View className="flex-1 pr-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    {isFutureDate ? "Preview Plan" : "Progres Hari Ini"}
                  </Text>
                  <Text className="text-2xl font-bold text-on-background mb-2">
                    {tasks.length > 0
                      ? `${completed} dari ${tasks.length} Selesai`
                      : "Belum ada target"}
                  </Text>
                  <Text className="text-sm text-on-surface-variant leading-relaxed font-medium">
                    {getMotivationalMessage(percent)}
                  </Text>
                </View>

                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-xl font-bold text-primary">
                    {tasks.length > 0 ? `${percent}%` : "-"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Daily Checklist */}
            <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant mb-6">
              <Text className="text-sm font-bold tracking-wide text-on-surface mb-6">
                {selectedPlanDayNumber
                  ? `Target Plan Hari ${selectedPlanDayNumber}`
                  : "Target Habit Coach"}
              </Text>

              {isFutureDate && tasks.length > 0 && (
                <View className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-4">
                  <Text className="text-xs font-bold text-primary leading-5">
                    Preview lembut: checkbox baru bisa dipakai saat tanggal ini tiba. Untuk
                    sekarang, kamu bisa melihat rencananya dulu.
                  </Text>
                </View>
              )}

              <View className="gap-3">
                {tasks.length === 0 && (
                  <View className="bg-surface-variant/50 border border-outline-variant rounded-2xl p-4">
                    <Text className="text-sm font-bold text-on-surface mb-1">
                      Kamu perlu generate plan 7 hari dulu.
                    </Text>
                    <Text className="text-xs text-on-surface-variant leading-5">
                      Setelah plan aktif, target harian dari Habit Coach akan muncul di sini.
                      Checklist fallback lama tidak ditampilkan sebagai task AI.
                    </Text>
                  </View>
                )}

                {tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => toggleTask(task.id)}
                    disabled={isFutureDate}
                    className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                      task.done
                        ? "bg-surface-variant/50 border-outline-variant shadow-sm"
                        : "bg-surface border-outline-variant hover:border-primary/50"
                    }`}
                  >
                    <View className="flex-row items-start gap-4 flex-1 pr-3">
                      <View
                        className={`w-12 h-12 rounded-2xl items-center justify-center bg-surface border border-outline-variant ${task.done ? "opacity-50" : ""}`}
                      >
                        <Text className="text-2xl">{task.emoji}</Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-base font-bold leading-6 ${task.done ? "text-on-surface-variant opacity-60 line-through" : "text-on-surface"}`}
                        >
                          {task.text}
                        </Text>
                        {task.reason ? (
                          <Text className="text-xs text-on-surface-variant leading-5 mt-1">
                            {task.reason}
                          </Text>
                        ) : null}
                        <Text
                          className={`text-xs font-bold uppercase tracking-wider mt-2 ${task.done ? "text-green-500" : isFutureDate ? "text-on-surface-variant" : "text-primary"}`}
                        >
                          {isFutureDate
                            ? "Bisa diceklis nanti"
                            : task.done
                              ? "Selesai"
                              : "Yuk Bisa!"}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`w-8 h-8 rounded-full border-2 items-center justify-center ${
                        task.done
                          ? "border-green-500 bg-green-500"
                          : isFutureDate
                            ? "border-outline-variant bg-surface-variant"
                            : "border-outline-variant bg-surface"
                      }`}
                    >
                      {task.done && <Text className="text-white font-bold text-xs">✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Symptoms Tracker */}
            <View className="bg-surface rounded-[32px] p-6 border border-outline-variant mb-6">
              <Text className="text-sm font-bold tracking-wide text-on-surface mb-6">
                💝 Apa yang kamu rasakan?
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {SYMPTOMS_LIST.map((symptom) => {
                  const isActive = symptoms.includes(symptom.id);
                  return (
                    <TouchableOpacity
                      key={symptom.id}
                      onPress={() => toggleSymptom(symptom.id)}
                      disabled={isFutureDate}
                      className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl shadow-sm ${
                        isActive
                          ? "bg-surface border-primary border-2 text-primary"
                          : "bg-surface-variant text-on-surface-variant border-transparent"
                      }`}
                    >
                      <Text className="text-lg">{symptom.emoji}</Text>
                      <Text className="text-sm font-bold text-on-background">{symptom.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {!activeHabitCoachPlan && (
              <View className="mt-4">
                <AiRecommendationSection
                  currentPhase={effectiveCurrentPhase}
                  activityHistory={activityHistory}
                  nickname={userNickname}
                />
              </View>
            )}
          </View>
        ) : (
          <View className="bg-white rounded-[32px] p-6 shadow-sm border border-outline-variant">
            <HistoryViewSafe
              historyFilter={historyFilter}
              setHistoryFilter={setHistoryFilter}
              activityHistory={activityHistory}
            />
          </View>
        )}
      </ScrollView>
      <TodayRecipesModal
        visible={recipesOpen}
        generatedForDate={todayDateKey}
        currentPhase={effectiveCurrentPhase}
        cycleDay={effectiveCycleDay}
        daysToNextPeriod={effectiveDaysToNextPeriod}
        nickname={userNickname}
        onBalanceChange={setAiCreditBalance}
        onClose={() => setRecipesOpen(false)}
      />
      <HabitCoachSheet
        visible={coachOpen}
        mode={activeHabitCoachPlan ? "renewal" : "initial"}
        loading={coachLoading}
        error={coachError}
        balance={aiCreditBalance}
        replacementWarning={replacementWarning}
        onClose={() => {
          if (!coachLoading) {
            setCoachOpen(false);
            setReplacementWarning(null);
            setReplaceActivePlan(false);
          }
        }}
        onGenerate={handleGenerateCoachPlan}
      />
    </SafeAreaView>
  );
}
