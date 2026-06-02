export type AiCreditPolicy = "paid" | "free_included";

export const DEFAULT_OPENROUTER_FREE_MODEL = "qwen/qwen3-next-80b-a3b-instruct:free";
export const DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
export const DEFAULT_OPENROUTER_PAID_MODEL = "openai/gpt-5-nano";

export interface ResolveOpenRouterModelsParams {
  policy: AiCreditPolicy;
  freeModel?: string;
  paidModel?: string;
}

export interface OpenRouterModelSelection {
  model: string;
  fallbackModels: string[];
}

function normalizeModels(models: Array<string | undefined>) {
  return models
    .filter((model): model is string => Boolean(model && model.trim()))
    .map((model) => model.trim())
    .filter((model, index, allModels) => allModels.indexOf(model) === index);
}

export function resolveOpenRouterModels({
  policy,
  freeModel,
  paidModel,
}: ResolveOpenRouterModelsParams): OpenRouterModelSelection {
  const primaryModel = freeModel?.trim() || DEFAULT_OPENROUTER_FREE_MODEL;
  const fallbackCandidates =
    policy === "paid"
      ? [DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL, paidModel?.trim() || DEFAULT_OPENROUTER_PAID_MODEL]
      : [DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL];

  const models = normalizeModels([primaryModel, ...fallbackCandidates]);
  const [model, ...fallbackModels] = models;

  return {
    model,
    fallbackModels,
  };
}
