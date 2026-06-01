export interface TodayRecipeGrocery {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface TodayRecipe {
  id: string;
  title: string;
  description: string;
  cookingTime: string;
  ingredients: string[];
  steps: string[];
  phaseBenefit: string;
  emoji: string;
}

export interface TodayRecipesResult {
  phaseBenefit: string;
  groceries: TodayRecipeGrocery[];
  recipes: TodayRecipe[];
  disclaimer: string;
}

export interface TodayRecipeGeneration {
  id: string;
  generatedForDate: string;
  phase: string;
  cycleDay: number | null;
  daysToNextPeriod: number | null;
  status: 'pending_charge' | 'active' | 'archived';
  aiModel: string;
  creditCost: number;
  createdAt: string;
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeNumberOrNull(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function mapApiTodayRecipes(value: any): TodayRecipesResult {
  const groceries: TodayRecipeGrocery[] = Array.isArray(value?.groceries)
    ? value.groceries.slice(0, 6).map((item: any, index: number) => ({
        id: String(item?.id || `grocery-${index + 1}`),
        name: safeString(item?.name, 'Bahan dapur'),
        desc: safeString(item?.desc, ''),
        emoji: safeString(item?.emoji, '🛒'),
      }))
    : [];

  const recipes: TodayRecipe[] = Array.isArray(value?.recipes)
    ? value.recipes.slice(0, 2).map((item: any, index: number) => ({
        id: String(item?.id || `recipe-${index + 1}`),
        title: safeString(item?.title, `Resep ${index + 1}`),
        description: safeString(item?.description, ''),
        cookingTime: safeString(item?.cookingTime, '-'),
        ingredients: Array.isArray(item?.ingredients)
          ? item.ingredients.map((entry: any) => safeString(entry)).filter(Boolean)
          : [],
        steps: Array.isArray(item?.steps)
          ? item.steps.map((entry: any) => safeString(entry)).filter(Boolean)
          : [],
        phaseBenefit: safeString(item?.phaseBenefit, ''),
        emoji: safeString(item?.emoji, '🍽️'),
      }))
    : [];

  return {
    phaseBenefit: safeString(value?.phaseBenefit, ''),
    groceries,
    recipes,
    disclaimer: safeString(value?.disclaimer, ''),
  };
}

export function mapApiTodayRecipeGeneration(row: any): TodayRecipeGeneration {
  if (!row) {
    throw new Error('Today recipe generation is empty');
  }

  return {
    id: String(row.id),
    generatedForDate: safeString(row.generated_for_date || row.generatedForDate),
    phase: safeString(row.phase, 'unknown_phase'),
    cycleDay: safeNumberOrNull(row.cycle_day ?? row.cycleDay),
    daysToNextPeriod: safeNumberOrNull(row.days_to_next_period ?? row.daysToNextPeriod),
    status: row.status === 'pending_charge' || row.status === 'archived' ? row.status : 'active',
    aiModel: safeString(row.ai_model || row.aiModel),
    creditCost: Number(row.credit_cost || row.creditCost || 0),
    createdAt: safeString(row.created_at || row.createdAt),
  };
}
