export interface TodayRecipeGrocery {
  id: number;
  name: string;
  desc: string;
  emoji: string;
}

export interface TodayRecipe {
  id: number;
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
  creditCost: number;
  result: TodayRecipesResult;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || '')).filter(Boolean) : [];
}

export function mapApiTodayRecipes(value: any): TodayRecipesResult {
  return {
    phaseBenefit: String(value?.phaseBenefit || ''),
    groceries: Array.isArray(value?.groceries)
      ? value.groceries.map((item: any, index: number) => ({
          id: Number(item?.id || index + 1),
          name: String(item?.name || ''),
          desc: String(item?.desc || ''),
          emoji: String(item?.emoji || 'basket'),
        }))
      : [],
    recipes: Array.isArray(value?.recipes)
      ? value.recipes.map((item: any, index: number) => ({
          id: Number(item?.id || index + 1),
          title: String(item?.title || ''),
          description: String(item?.description || ''),
          cookingTime: String(item?.cookingTime || ''),
          ingredients: stringArray(item?.ingredients),
          steps: stringArray(item?.steps),
          phaseBenefit: String(item?.phaseBenefit || ''),
          emoji: String(item?.emoji || 'cutlery'),
        }))
      : [],
    disclaimer: String(value?.disclaimer || ''),
  };
}

export function mapApiTodayRecipeGeneration(row: any): TodayRecipeGeneration {
  return {
    id: String(row?.id || ''),
    generatedForDate: String(row?.generated_for_date || row?.generatedForDate || ''),
    phase: String(row?.phase || ''),
    creditCost: Number(row?.credit_cost || row?.creditCost || 0),
    result: mapApiTodayRecipes(row?.result || row),
  };
}
