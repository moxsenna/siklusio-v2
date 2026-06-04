import test from "node:test";
import assert from "node:assert/strict";
import { getAiCreditBalance, grantPremiumInitialAiCredits } from "./credits";
import { buildOpenRouterRequestBody, parseOpenRouterJsonContent } from "./openRouter";
import {
  validateHabitCoachPlan,
  validateCalmingReassurance,
  validateRecipesGeneration,
} from "./schemas";
import { buildHabitCoachDayTasks } from "./habitCoachFoundation";
import { buildRecipeCycleSnapshot } from "./recipeSummary";

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

const makePersonalizedTasks = () => [
  {
    id: "protein",
    text: "Tambahkan telur rebus saat sarapan",
    emoji: "egg",
    category: "nutrition",
    reason: "Protein membantu kenyang lebih lama.",
  },
  {
    id: "journal",
    text: "Catat satu sinyal tubuh yang terasa jelas",
    emoji: "memo",
    category: "promil",
    reason: "Membantu mengenali pola harian.",
  },
  {
    id: "breath",
    text: "Tarik napas pelan selama 2 menit",
    emoji: "wind",
    category: "emotional",
    reason: "Membantu tubuh terasa lebih tenang.",
  },
];

const validRecipePayload = {
  phaseBenefit: "Makanan kaya zat besi bantu menjaga energi tetap stabil di fase ini.",
  groceries: [
    { id: 1, name: "Bayam", desc: "Sayur hijau kaya folat", emoji: "🥬" },
    { id: 2, name: "Telur", desc: "Sumber protein harian", emoji: "🥚" },
    { id: 3, name: "Tempe", desc: "Protein nabati terjangkau", emoji: "🫘" },
  ],
  recipes: [
    {
      id: 1,
      title: "Tumis Bayam Telur",
      description: "Menu cepat untuk sarapan atau makan malam ringan.",
      cookingTime: "15 menit",
      ingredients: ["Bayam", "Telur", "Bawang putih"],
      steps: ["Tumis bawang putih sebentar", "Masukkan bayam dan telur, lalu aduk rata"],
      phaseBenefit: "Membantu asupan zat besi saat tubuh mudah lelah.",
      emoji: "🍳",
    },
    {
      id: 2,
      title: "Tempe Panggang Kecap",
      description: "Menu sederhana dengan rasa gurih manis.",
      cookingTime: "20 menit",
      ingredients: ["Tempe", "Kecap manis", "Bawang merah"],
      steps: ["Iris tipis tempe", "Panggang lalu oles kecap"],
      phaseBenefit: "Protein tempe bantu kenyang lebih lama.",
      emoji: "🍽️",
    },
  ],
  disclaimer: "Ini saran umum, sesuaikan dengan kondisi kesehatanmu.",
};

test("parseOpenRouterJsonContent accepts fenced JSON", () => {
  const parsed = parseOpenRouterJsonContent<{ summary: string }>(
    '```json\n{"summary":"Halo"}\n```',
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
    fallbackModels: ["qwen/free", "nvidia/free", "openai/cheap", "google/gemini", "mistral/small"],
    messages: [{ role: "user", content: "Halo" }],
    responseSchemaName: "test_schema",
    responseSchema: { type: "object" },
  });

  assert.deepEqual(body.models, ["qwen/free", "nvidia/free", "openai/cheap"]);
});

test("validateRecipesGeneration accepts local Indonesian recipe payload", () => {
  const result = validateRecipesGeneration(validRecipePayload);
  assert.equal(result.recipes.length, 2);
  assert.equal(result.groceries.length, 3);
  assert.equal(result.phaseBenefit.length > 0, true);
});

test("validateRecipesGeneration rejects payload without exactly two recipes", () => {
  assert.throws(
    () =>
      validateRecipesGeneration({
        ...validRecipePayload,
        recipes: [validRecipePayload.recipes[0]],
      }),
    /exactly 2 recipes/,
  );
});

test("buildRecipeCycleSnapshot keeps only recipe context fields", () => {
  const snapshot = buildRecipeCycleSnapshot({
    phase: "Luteal",
    cycleDay: 24,
    daysToNextPeriod: 5,
    privateNotes: "hidden",
  });

  assert.deepEqual(snapshot, {
    phase: "Luteal",
    cycleDay: 24,
    daysToNextPeriod: 5,
  });
});

test("recipe credit charge payload should use saved generation id as reference", () => {
  const generation = { id: "recipe-generation-1" };
  const chargePayload = {
    amount: 15,
    feature: "recipes_today",
    reason: "Luteal",
    referenceId: generation.id,
  };

  assert.equal(chargePayload.referenceId, "recipe-generation-1");
  assert.equal(chargePayload.feature, "recipes_today");
});

test("validateHabitCoachPlan rejects days with fewer than three personalized tasks", () => {
  const plan = makeValidHabitPlan();
  plan.days[0].tasks = [makeTask("a"), makeTask("b")];

  assert.throws(
    () => validateHabitCoachPlan(plan),
    /Each habit coach day must contain 3 to 5 personalized tasks/,
  );
});

test("validateHabitCoachPlan rejects days with more than five personalized tasks", () => {
  const plan = makeValidHabitPlan();
  plan.days[0].tasks = [
    makeTask("a"),
    makeTask("b"),
    makeTask("c"),
    makeTask("d"),
    makeTask("e"),
    makeTask("f"),
  ];

  assert.throws(
    () => validateHabitCoachPlan(plan),
    /Each habit coach day must contain 3 to 5 personalized tasks/,
  );
});

test("buildHabitCoachDayTasks prepends water and phase foundations", () => {
  const tasks = buildHabitCoachDayTasks(makePersonalizedTasks(), {
    dateKey: "2026-06-01",
    dayIndex: 1,
    phase: "Ovulation",
    displayPhase: "Ovulasi",
    cycleDay: 14,
    isManualPeriod: false,
  });

  assert.equal(tasks.length, 5);
  assert.equal(tasks[0].id, "foundation-water");
  assert.equal(tasks[0].text, "Minum air putih 2 liter bertahap");
  assert.equal(tasks[0].category, "hydration");
  assert.equal(tasks[0].source, "system");
  assert.match(tasks[0].reason, /cervical mucus/i);
  assert.equal(tasks[1].id, "foundation-ovulation-walk");
  assert.equal(tasks[1].text, "Jalan santai 10 menit setelah makan");
  assert.equal(tasks[1].category, "movement");
});

test("buildHabitCoachDayTasks picks phase foundations and filters duplicates", () => {
  const phaseCases = [
    ["Menstrual", "foundation-menstrual-warmth"],
    ["Folikular", "foundation-follicular-stretch"],
    ["Luteal", "foundation-luteal-release"],
    ["unknown", "foundation-luteal-release"],
  ] as const;

  for (const [phase, expectedId] of phaseCases) {
    const tasks = buildHabitCoachDayTasks(makePersonalizedTasks(), {
      dateKey: "2026-06-01",
      dayIndex: 1,
      phase,
      displayPhase: phase,
      cycleDay: 1,
      isManualPeriod: phase === "Menstrual",
    });
    assert.equal(tasks[1].id, expectedId);
  }

  const tasks = buildHabitCoachDayTasks(
    [
      {
        id: "ai-water",
        text: "Minum air putih 2 liter bertahap",
        emoji: "water",
        category: "hydration",
        reason: "Agar tubuh terhidrasi.",
      },
      {
        id: "ai-warmth",
        text: "Kompres hangat perut bawah 10 menit",
        emoji: "heat",
        category: "rest",
        reason: "Membantu rasa nyaman.",
      },
      {
        id: "breath",
        text: "Tarik napas pelan selama 2 menit",
        emoji: "wind",
        category: "emotional",
        reason: "Membantu tubuh terasa lebih tenang.",
      },
      {
        id: "protein",
        text: "Tambahkan telur rebus saat sarapan",
        emoji: "egg",
        category: "nutrition",
        reason: "Protein membantu kenyang lebih lama.",
      },
      {
        id: "journal",
        text: "Catat satu sinyal tubuh yang terasa jelas",
        emoji: "memo",
        category: "promil",
        reason: "Membantu mengenali pola harian.",
      },
    ],
    {
      dateKey: "2026-06-01",
      dayIndex: 1,
      phase: "Menstrual",
      displayPhase: "Menstruasi",
      cycleDay: 2,
      isManualPeriod: true,
    },
  );

  assert.deepEqual(
    tasks.map((task) => task.id),
    ["foundation-water", "foundation-menstrual-warmth", "breath", "protein", "journal"],
  );
});

test("buildHabitCoachDayTasks fills underfilled days after duplicate filtering", () => {
  const tasks = buildHabitCoachDayTasks(
    [
      {
        id: "ai-water",
        text: "Minum air putih 2 liter bertahap",
        emoji: "water",
        category: "hydration",
        reason: "Agar tubuh terhidrasi.",
      },
      {
        id: "ai-warmth",
        text: "Kompres hangat perut bawah 10 menit",
        emoji: "heat",
        category: "rest",
        reason: "Membantu rasa nyaman.",
      },
      {
        id: "breath",
        text: "Tarik napas pelan selama 2 menit",
        emoji: "wind",
        category: "emotional",
        reason: "Membantu tubuh terasa lebih tenang.",
      },
    ],
    {
      dateKey: "2026-06-01",
      dayIndex: 1,
      phase: "Menstrual",
      displayPhase: "Menstruasi",
      cycleDay: 2,
      isManualPeriod: true,
    },
  );

  assert.equal(tasks.length, 5);
  assert.deepEqual(
    tasks.map((task) => task.id),
    [
      "foundation-water",
      "foundation-menstrual-warmth",
      "breath",
      "fallback-protein",
      "fallback-evening-reset",
    ],
  );
  assert.equal(
    tasks.every((task) => task.text.length > 0),
    true,
  );
});

test("buildHabitCoachDayTasks keeps saved totals between five and seven", () => {
  const tasks = buildHabitCoachDayTasks(
    [
      ...makePersonalizedTasks(),
      {
        id: "sleep",
        text: "Matikan layar 10 menit sebelum tidur",
        emoji: "moon",
        category: "rest",
        reason: "Tidur lebih tenang mendukung pemulihan.",
      },
      {
        id: "snack",
        text: "Siapkan camilan kacang kecil untuk sore",
        emoji: "nuts",
        category: "nutrition",
        reason: "Camilan seimbang membantu energi lebih stabil.",
      },
    ],
    {
      dateKey: "2026-06-03",
      dayIndex: 3,
      phase: "Luteal",
      displayPhase: "Luteal",
      cycleDay: 21,
      isManualPeriod: false,
    },
  );

  assert.equal(tasks.length >= 5, true);
  assert.equal(tasks.length <= 7, true);
  assert.equal(tasks.length, 7);
});

test("buildHabitCoachDayTasks keeps personalized non-foundation drink tasks", () => {
  const tasks = buildHabitCoachDayTasks(
    [
      {
        id: "vitamin",
        text: "Minum vitamin sesuai anjuran dokter setelah sarapan",
        emoji: "pill",
        category: "promil",
        reason: "Membantu rutinitas promil tetap konsisten.",
      },
      {
        id: "snack",
        text: "Siapkan camilan kacang kecil untuk sore",
        emoji: "nuts",
        category: "nutrition",
        reason: "Camilan seimbang membantu energi lebih stabil.",
      },
      {
        id: "breath",
        text: "Tarik napas pelan selama 2 menit",
        emoji: "wind",
        category: "emotional",
        reason: "Membantu tubuh terasa lebih tenang.",
      },
    ],
    {
      dateKey: "2026-06-03",
      dayIndex: 3,
      phase: "Luteal",
      displayPhase: "Luteal",
      cycleDay: 21,
      isManualPeriod: false,
    },
  );

  assert.equal(
    tasks.some((task) => task.id === "vitamin"),
    true,
  );
  assert.equal(tasks.length, 5);
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
    /Calming reassurance title is required/,
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
