export type HabitCategory =
  | 'hydration'
  | 'nutrition'
  | 'movement'
  | 'rest'
  | 'emotional'
  | 'promil'
  | 'partner';

export type HabitCoachMode = 'initial' | 'renewal';

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
  status: 'pending_charge' | 'active' | 'completed' | 'archived';
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
