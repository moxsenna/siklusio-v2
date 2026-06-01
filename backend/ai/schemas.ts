const habitCategories = new Set([
  "hydration",
  "nutrition",
  "movement",
  "rest",
  "emotional",
  "promil",
  "partner",
]);

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
          dayIndex: { type: "integer" },
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
                  enum: Array.from(habitCategories),
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
    bodySignals: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    importantDates: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
    focusThisWeek: { type: "string" },
    habitCoachBridge: { type: "string" },
    disclaimer: { type: "string" },
  },
};

export interface HabitCoachAiPlan {
  coachSummary: string;
  days: Array<{
    dayIndex: number;
    focus: string;
    tasks: Array<{
      id: string;
      text: string;
      emoji: string;
      category: string;
      reason: string;
    }>;
  }>;
}

export interface CycleGuideAiResult {
  summary: string;
  bodySignals: string[];
  importantDates: string[];
  focusThisWeek: string;
  habitCoachBridge: string;
  disclaimer: string;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assertString(value: unknown, message: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }
}

export function validateHabitCoachPlan(value: unknown): HabitCoachAiPlan {
  if (!isPlainRecord(value) || !Array.isArray(value.days)) {
    throw new Error("Invalid habit coach plan payload");
  }

  assertString(value.coachSummary, "Habit coach summary is required");

  if (value.days.length !== 7) {
    throw new Error("Habit coach plan must contain exactly 7 days");
  }

  value.days.forEach((day, dayIndex) => {
    if (!isPlainRecord(day) || !Array.isArray(day.tasks)) {
      throw new Error("Invalid habit coach day payload");
    }
    if (typeof day.dayIndex !== "number" || day.dayIndex !== dayIndex + 1) {
      throw new Error("Habit coach dayIndex must run from 1 to 7");
    }
    assertString(day.focus, "Habit coach day focus is required");
    if (day.tasks.length < 3 || day.tasks.length > 5) {
      throw new Error("Each habit coach day must contain 3 to 5 personalized tasks");
    }

    day.tasks.forEach((task) => {
      if (!isPlainRecord(task)) {
        throw new Error("Invalid habit coach task payload");
      }
      assertString(task.id, "Habit coach task id is required");
      assertString(task.text, "Habit coach task text is required");
      assertString(task.emoji, "Habit coach task emoji is required");
      assertString(task.reason, "Habit coach task reason is required");
      if (typeof task.category !== "string" || !habitCategories.has(task.category)) {
        throw new Error("Invalid habit coach task category");
      }
    });
  });

  return value as unknown as HabitCoachAiPlan;
}

export function validateCycleGuide(value: unknown): CycleGuideAiResult {
  if (!isPlainRecord(value)) {
    throw new Error("Invalid cycle guide payload");
  }

  assertString(value.summary, "Cycle guide summary is required");
  assertString(value.focusThisWeek, "Cycle guide weekly focus is required");
  assertString(value.habitCoachBridge, "Cycle guide habit bridge is required");
  assertString(value.disclaimer, "Cycle guide disclaimer is required");

  if (!Array.isArray(value.bodySignals) || value.bodySignals.length < 2 || value.bodySignals.length > 4) {
    throw new Error("Cycle guide bodySignals must contain 2 to 4 items");
  }

  if (!Array.isArray(value.importantDates) || value.importantDates.length < 1 || value.importantDates.length > 4) {
    throw new Error("Cycle guide importantDates must contain 1 to 4 items");
  }

  value.bodySignals.forEach((item) => assertString(item, "Cycle guide body signal is required"));
  value.importantDates.forEach((item) => assertString(item, "Cycle guide important date is required"));

  return value as unknown as CycleGuideAiResult;
}

export const recipesGenerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["phaseBenefit", "groceries", "recipes", "disclaimer"],
  properties: {
    phaseBenefit: { type: "string" },
    groceries: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "desc", "emoji"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          desc: { type: "string" },
          emoji: { type: "string" }
        }
      }
    },
    recipes: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "title",
          "description",
          "cookingTime",
          "ingredients",
          "steps",
          "phaseBenefit",
          "emoji",
        ],
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          cookingTime: { type: "string" },
          ingredients: {
            type: "array",
            minItems: 3,
            maxItems: 8,
            items: { type: "string" }
          },
          steps: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string" }
          },
          phaseBenefit: { type: "string" },
          emoji: { type: "string" }
        }
      }
    },
    disclaimer: { type: "string" }
  }
};

export const cycleReportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "bodyInsights", "actionPlan", "encouragement"],
  properties: {
    summary: { type: "string" },
    bodyInsights: {
      type: "array",
      items: { type: "string" }
    },
    actionPlan: {
      type: "array",
      items: { type: "string" }
    },
    encouragement: { type: "string" }
  }
};

export const habitsInsightSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "symptomAnalysis", "tips", "motivation"],
  properties: {
    summary: { type: "string" },
    symptomAnalysis: { type: "string" },
    tips: {
      type: "array",
      items: { type: "string" }
    },
    motivation: { type: "string" }
  }
};

export const calmingReassuranceSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "opening",
    "validation",
    "grounding",
    "affirmation",
    "reassurance",
    "breathingTip",
    "closing",
  ],
  properties: {
    title: { type: "string" },
    opening: { type: "string" },
    validation: { type: "string" },
    grounding: { type: "string" },
    affirmation: { type: "string" },
    reassurance: { type: "string" },
    breathingTip: { type: "string" },
    closing: { type: "string" },
  }
};

export interface RecipesGenerationResult {
  phaseBenefit: string;
  groceries: Array<{ id: number; name: string; desc: string; emoji: string }>;
  recipes: Array<{
    id: number;
    title: string;
    description: string;
    cookingTime: string;
    ingredients: string[];
    steps: string[];
    phaseBenefit: string;
    emoji: string;
  }>;
  disclaimer: string;
}

export interface CycleReportResult {
  summary: string;
  bodyInsights: string[];
  actionPlan: string[];
  encouragement: string;
}

export interface HabitsInsightResult {
  summary: string;
  symptomAnalysis: string;
  tips: string[];
  motivation: string;
}

export interface CalmingReassuranceResult {
  title: string;
  opening: string;
  validation: string;
  grounding: string;
  affirmation: string;
  reassurance: string;
  breathingTip: string;
  closing: string;
}

export function validateRecipesGeneration(value: unknown): RecipesGenerationResult {
  if (!isPlainRecord(value) || !Array.isArray(value.groceries) || !Array.isArray(value.recipes)) {
    throw new Error("Invalid recipes generation payload");
  }

  assertString(value.phaseBenefit, "Recipe generation phase benefit is required");
  assertString(value.disclaimer, "Recipe generation disclaimer is required");

  if (value.groceries.length < 3 || value.groceries.length > 6) {
    throw new Error("Recipe generation groceries must contain 3 to 6 items");
  }
  if (value.recipes.length !== 2) {
    throw new Error("Recipe generation must contain exactly 2 recipes");
  }

  value.groceries.forEach((grocery) => {
    if (!isPlainRecord(grocery)) throw new Error("Invalid grocery payload");
    if (typeof grocery.id !== "number") throw new Error("Grocery id is required");
    assertString(grocery.name, "Grocery name is required");
    assertString(grocery.desc, "Grocery description is required");
    assertString(grocery.emoji, "Grocery emoji is required");
  });

  value.recipes.forEach((recipe) => {
    if (!isPlainRecord(recipe)) throw new Error("Invalid recipe payload");
    if (typeof recipe.id !== "number") throw new Error("Recipe id is required");
    assertString(recipe.title, "Recipe title is required");
    assertString(recipe.description, "Recipe description is required");
    assertString(recipe.cookingTime, "Recipe cooking time is required");
    assertString(recipe.phaseBenefit, "Recipe phase benefit is required");
    assertString(recipe.emoji, "Recipe emoji is required");

    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 3 || recipe.ingredients.length > 8) {
      throw new Error("Recipe ingredients must contain 3 to 8 items");
    }
    if (!Array.isArray(recipe.steps) || recipe.steps.length < 2 || recipe.steps.length > 6) {
      throw new Error("Recipe steps must contain 2 to 6 items");
    }

    recipe.ingredients.forEach((item) => assertString(item, "Recipe ingredient is required"));
    recipe.steps.forEach((item) => assertString(item, "Recipe step is required"));
  });

  return value as unknown as RecipesGenerationResult;
}

export function validateCycleReport(value: unknown): CycleReportResult {
  if (!isPlainRecord(value) || !Array.isArray(value.bodyInsights) || !Array.isArray(value.actionPlan)) {
    throw new Error("Invalid cycle report payload");
  }
  return value as unknown as CycleReportResult;
}

export function validateHabitsInsight(value: unknown): HabitsInsightResult {
  if (!isPlainRecord(value) || !Array.isArray(value.tips)) {
    throw new Error("Invalid habits insight payload");
  }
  return value as unknown as HabitsInsightResult;
}

export function validateCalmingReassurance(value: unknown): CalmingReassuranceResult {
  if (!isPlainRecord(value)) {
    throw new Error("Invalid calming reassurance payload");
  }
  assertString(value.title, "Calming reassurance title is required");
  assertString(value.opening, "Calming reassurance opening is required");
  assertString(value.validation, "Calming reassurance validation is required");
  assertString(value.grounding, "Calming reassurance grounding is required");
  assertString(value.affirmation, "Calming reassurance affirmation is required");
  assertString(value.reassurance, "Calming reassurance legacy reassurance is required");
  assertString(value.breathingTip, "Calming reassurance breathing tip is required");
  assertString(value.closing, "Calming reassurance closing is required");
  return value as unknown as CalmingReassuranceResult;
}
