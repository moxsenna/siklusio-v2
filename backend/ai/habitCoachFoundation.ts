export interface HabitCoachCycleDay {
  dateKey?: string;
  dayIndex?: number;
  phase?: string;
  displayPhase?: string;
  cycleDay?: number | null;
  isManualPeriod?: boolean;
}

export interface HabitCoachTask {
  id: string;
  text: string;
  emoji: string;
  category: string;
  reason: string;
  source?: "system" | string;
}

type CyclePhase = "menstrual" | "ovulation" | "follicular" | "luteal";

const foundationWaterTask: HabitCoachTask = {
  id: "foundation-water",
  text: "Minum air putih 2 liter bertahap",
  emoji: "water",
  category: "hydration",
  reason:
    "Hidrasi cukup membantu menjaga energi, mendukung kualitas cervical mucus, dan membantu pemulihan tubuh.",
  source: "system",
};

const phaseFoundationTasks: Record<CyclePhase, HabitCoachTask> = {
  menstrual: {
    id: "foundation-menstrual-warmth",
    text: "Kompres hangat perut bawah 10 menit",
    emoji: "heat",
    category: "rest",
    reason: "Hangat lembut membantu perut bawah terasa lebih nyaman saat menstruasi.",
    source: "system",
  },
  ovulation: {
    id: "foundation-ovulation-walk",
    text: "Jalan santai 10 menit setelah makan",
    emoji: "walking",
    category: "movement",
    reason: "Gerak ringan setelah makan membantu energi tetap stabil pada fase ovulasi.",
    source: "system",
  },
  follicular: {
    id: "foundation-follicular-stretch",
    text: "Peregangan seluruh badan 8 menit",
    emoji: "stretch",
    category: "movement",
    reason: "Peregangan ringan membantu tubuh memanfaatkan energi yang mulai naik.",
    source: "system",
  },
  luteal: {
    id: "foundation-luteal-release",
    text: "Peregangan pinggang dan bahu 7 menit",
    emoji: "relief",
    category: "movement",
    reason: "Peregangan lembut membantu melepas tegang pada fase luteal.",
    source: "system",
  },
};

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function resolveCyclePhase(cycleDay?: HabitCoachCycleDay): CyclePhase {
  const phaseText = normalizeText(`${cycleDay?.phase || ""} ${cycleDay?.displayPhase || ""}`);

  if (cycleDay?.isManualPeriod || /menstrual|menstruasi|haid|period/.test(phaseText)) {
    return "menstrual";
  }
  if (/ovulasi|ovulation/.test(phaseText)) {
    return "ovulation";
  }
  if (/follicular|folikular/.test(phaseText)) {
    return "follicular";
  }
  return "luteal";
}

export function getHabitCoachFoundationTasks(cycleDay?: HabitCoachCycleDay) {
  return [foundationWaterTask, phaseFoundationTasks[resolveCyclePhase(cycleDay)]];
}

function isHydrationDuplicate(task: HabitCoachTask) {
  const text = normalizeText(task.text);
  return (
    task.id === foundationWaterTask.id ||
    normalizeText(task.category) === "hydration" ||
    /air putih|hidrasi|2 liter/.test(text) ||
    (/minum/.test(text) && /air|putih/.test(text))
  );
}

function isPhaseDuplicate(task: HabitCoachTask, foundationTask: HabitCoachTask) {
  const text = normalizeText(task.text);
  const category = normalizeText(task.category);

  if (task.id === foundationTask.id || text === normalizeText(foundationTask.text)) {
    return true;
  }

  switch (foundationTask.id) {
    case "foundation-menstrual-warmth":
      return category === "rest" && /kompres|hangat|perut bawah/.test(text);
    case "foundation-ovulation-walk":
      return category === "movement" && /jalan|santai|setelah makan/.test(text);
    case "foundation-follicular-stretch":
      return category === "movement" && /peregangan|stretch|seluruh badan/.test(text);
    default:
      return category === "movement" && /peregangan|stretch|pinggang|bahu/.test(text);
  }
}

function isFoundationDuplicate(task: HabitCoachTask, phaseFoundation: HabitCoachTask) {
  return isHydrationDuplicate(task) || isPhaseDuplicate(task, phaseFoundation);
}

export function buildHabitCoachDayTasks(
  aiTasks: HabitCoachTask[],
  cycleDay?: HabitCoachCycleDay
): HabitCoachTask[] {
  const foundations = getHabitCoachFoundationTasks(cycleDay);
  const personalizedTasks = aiTasks.filter((task) => !isFoundationDuplicate(task, foundations[1]));

  if (personalizedTasks.length < 3) {
    throw new Error("Habit coach day must keep at least 3 personalized tasks after filtering foundation duplicates");
  }

  return [...foundations, ...personalizedTasks.slice(0, 5)];
}
