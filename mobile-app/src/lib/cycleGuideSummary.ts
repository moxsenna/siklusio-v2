import type { PredictionConfidence } from './cyclePrediction';
import type { CyclePhase, DailyRecord } from './cycleUtils';

export type CycleGuideLevel = 'starter' | 'active' | 'personal';

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
  Menstrual: 'tubuh sedang memulai ulang siklus dan biasanya butuh ritme yang lebih lembut',
  Folikular: 'energi biasanya mulai naik dan tubuh bersiap menuju masa subur',
  Ovulasi: 'masa subur sedang menjadi fokus utama',
  Luteal: 'tubuh masuk fase menunggu dan sensitivitas emosi bisa meningkat',
};

function countObservedDays(activityHistory: Record<string, DailyRecord>) {
  return Object.keys(activityHistory).length;
}

function getConfidenceLabel(confidence: PredictionConfidence) {
  if (confidence === 'high') return 'Pola cukup stabil';
  if (confidence === 'medium') return 'Mulai personal';
  return 'Butuh catatan lagi';
}

export function buildCycleGuidePreview(input: BuildCycleGuidePreviewInput): CycleGuidePreview {
  const observedDayCount = countObservedDays(input.activityHistory);
  const level: CycleGuideLevel =
    input.hasManualLogs && input.cycleConfidence !== 'low' && observedDayCount >= 3
      ? 'personal'
      : observedDayCount > 0 || input.hasManualLogs
        ? 'active'
        : 'starter';

  const title =
    level === 'starter'
      ? 'Panduan awal siklusmu'
      : level === 'active'
        ? 'Panduan minggu ini'
        : 'Insight personal siklusmu';

  const suggestedHabitFocus =
    input.currentPhase === 'Ovulasi'
      ? 'promil dan energi'
      : input.currentPhase === 'Menstrual'
        ? 'istirahat dan hidrasi'
        : input.currentPhase === 'Luteal'
          ? 'emosi, tidur, dan ketenangan'
          : 'nutrisi dan konsistensi ringan';

  return {
    level,
    title,
    summary: `Hari ke-${input.cycleDay}. Saat ini ${phaseCopy[input.currentPhase]}. Perkiraan haid berikutnya sekitar ${input.daysToNextPeriod} hari lagi.`,
    confidenceLabel: getConfidenceLabel(input.cycleConfidence),
    canShowPersonalPatterns: level === 'personal',
    suggestedHabitFocus,
  };
}
