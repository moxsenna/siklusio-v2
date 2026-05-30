export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatOptions {
  apiKey: string;
  model: string;
  fallbackModels?: Array<string | undefined>;
  messages: OpenRouterMessage[];
  responseSchemaName: string;
  responseSchema: Record<string, unknown>;
  maxCompletionTokens?: number;
}

export interface OpenRouterJsonResult<T> {
  model: string;
  data: T;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function stripJsonFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function parseOpenRouterJsonContent<T>(content: string): T {
  try {
    return JSON.parse(stripJsonFence(content)) as T;
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }
}

export function buildOpenRouterRequestBody(options: OpenRouterChatOptions) {
  const fallbackModels = (options.fallbackModels || []).filter(
    (model): model is string => Boolean(model && model.trim())
  );

  const body: Record<string, unknown> = {
    messages: options.messages,
    temperature: 0.4,
    max_completion_tokens: options.maxCompletionTokens ?? 1800,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: options.responseSchemaName,
        strict: true,
        schema: options.responseSchema,
      },
    },
  };

  if (fallbackModels.length > 0) {
    body.models = [options.model, ...fallbackModels];
  } else {
    body.model = options.model;
  }

  return body;
}

export async function callOpenRouterJson<T>(
  options: OpenRouterChatOptions
): Promise<OpenRouterJsonResult<T>> {
  if (!options.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://app.siklusio.web.id",
      "X-OpenRouter-Title": "Siklusio",
    },
    body: JSON.stringify(buildOpenRouterRequestBody(options)),
  });

  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenRouter error (${response.status})`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned empty content");
  }

  return {
    model: json.model || options.model,
    data: parseOpenRouterJsonContent<T>(content),
    usage: json.usage,
  };
}
