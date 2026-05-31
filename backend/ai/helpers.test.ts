import test from "node:test";
import assert from "node:assert/strict";
import { getAiCreditBalance, grantPremiumInitialAiCredits } from "./credits";
import { buildOpenRouterRequestBody, parseOpenRouterJsonContent } from "./openRouter";
import { validateHabitCoachPlan, validateCalmingReassurance } from "./schemas";

const makeTask = (id: string) => ({
  id,
  text: `Task ${id}`,
  emoji: "sparkles",
  category: "hydration",
  reason: "Supaya target harian terasa ringan.",
});

const makeValidHabitPlan = () => ({
  coachSummary: "Mulai dari kebiasaan kecil yang realistis.",
  days: Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex: dayIndex + 1,
    focus: `Fokus ${dayIndex + 1}`,
    tasks: [makeTask("a"), makeTask("b"), makeTask("c")],
  })),
});

test("parseOpenRouterJsonContent accepts fenced JSON", () => {
  const parsed = parseOpenRouterJsonContent<{ summary: string }>(
    '```json\n{"summary":"Halo"}\n```'
  );

  assert.deepEqual(parsed, { summary: "Halo" });
});

test("buildOpenRouterRequestBody orders primary model before fallbacks", () => {
  const body = buildOpenRouterRequestBody({
    apiKey: "test-key",
    model: "qwen/free",
    fallbackModels: ["openai/cheap", undefined],
    messages: [{ role: "user", content: "Halo" }],
    responseSchemaName: "test_schema",
    responseSchema: { type: "object" },
  });

  assert.deepEqual(body.models, ["qwen/free", "openai/cheap"]);
  assert.equal("model" in body, false);
  assert.equal(body.max_tokens, 1800);
  assert.equal("max_completion_tokens" in body, false);
  assert.deepEqual(body.reasoning, { effort: "none", exclude: true });
  assert.equal((body.messages as any[])[0].role, "system");
  assert.match((body.messages as any[])[0].content, /Return only valid JSON/);
});

test("buildOpenRouterRequestBody caps fallback routing to three models", () => {
  const body = buildOpenRouterRequestBody({
    apiKey: "test-key",
    model: "qwen/free",
    fallbackModels: [
      "qwen/free",
      "nvidia/free",
      "openai/cheap",
      "google/gemini",
      "mistral/small",
    ],
    messages: [{ role: "user", content: "Halo" }],
    responseSchemaName: "test_schema",
    responseSchema: { type: "object" },
  });

  assert.deepEqual(body.models, ["qwen/free", "nvidia/free", "openai/cheap"]);
});

test("validateHabitCoachPlan rejects days with fewer than three tasks", () => {
  const plan = makeValidHabitPlan();
  plan.days[0].tasks = [makeTask("a"), makeTask("b")];

  assert.throws(
    () => validateHabitCoachPlan(plan),
    /Each habit coach day must contain 3 to 5 tasks/
  );
});

test("validateCalmingReassurance requires structured letter sections with legacy fields", () => {
  const result = validateCalmingReassurance({
    title: "Kamu tidak sendirian",
    opening: "Aku dengar rasa cemasmu hari ini.",
    validation: "Perasaanmu valid dan tidak berlebihan.",
    grounding: "Untuk saat ini, cukup kembali ke napasmu.",
    affirmation: "Aku boleh pelan-pelan.",
    reassurance: "Aku dengar rasa cemasmu hari ini. Perasaanmu valid dan tidak berlebihan.",
    breathingTip: "Tarik napas 4 detik, tahan 2 detik, hembuskan 4 detik.",
    closing: "Aku di sini menemanimu.",
  });

  assert.equal(result.title, "Kamu tidak sendirian");
  assert.equal(result.breathingTip.includes("Tarik napas"), true);
});

test("validateCalmingReassurance rejects legacy-only reassurance payload", () => {
  assert.throws(
    () =>
      validateCalmingReassurance({
        reassurance: "Kamu tidak sendirian.",
        breathingTip: "Tarik napas pelan.",
      }),
    /Calming reassurance title is required/
  );
});

test("getAiCreditBalance ensures a balance row before reading", async () => {
  const calls: string[] = [];
  const supabaseAdmin = {
    async rpc(name: string, params: Record<string, unknown>) {
      calls.push(`${name}:${params.p_user_id}`);
      return { data: null, error: null };
    },
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        select(column: string) {
          calls.push(`select:${column}`);
          return {
            eq(columnName: string, value: string) {
              calls.push(`eq:${columnName}:${value}`);
              return {
                async maybeSingle() {
                  return { data: { balance: 123 }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  const balance = await getAiCreditBalance(supabaseAdmin, "user-1");

  assert.equal(balance, 123);
  assert.equal(calls[0], "ensure_ai_credit_balance:user-1");
});

test("grantPremiumInitialAiCredits skips users that already received the bonus", async () => {
  const calls: string[] = [];
  const supabaseAdmin = {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        select(column: string) {
          calls.push(`select:${column}`);
          return {
            eq(columnName: string, value: string) {
              calls.push(`eq:${columnName}:${value}`);
              return this;
            },
            async maybeSingle() {
              return { data: { id: "ledger-1" }, error: null };
            },
          };
        },
      };
    },
    async rpc() {
      calls.push("rpc:grant_ai_credits");
      return { data: null, error: null };
    },
  };

  const result = await grantPremiumInitialAiCredits({
    supabaseAdmin,
    userId: "user-1",
    referenceId: "checkout-1",
  });

  assert.equal(result, null);
  assert.equal(calls.includes("rpc:grant_ai_credits"), false);
});
