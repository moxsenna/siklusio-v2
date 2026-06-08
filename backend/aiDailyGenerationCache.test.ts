import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";
import { getTodayDateKey } from "./src/services/aiDailyGenerationCache";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  OPENROUTER_API_KEY: "openrouter-key",
  OPENROUTER_FREE_MODEL: "google/gemini-2.0-flash-exp:free",
  AI_RATE_LIMIT_MAX: "100",
};

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const cycleReportPayload = {
  summary: "Ringkasan siklus hari ini",
  bodyInsights: ["Energi cenderung naik di fase ini"],
  actionPlan: ["Istirahat cukup", "Catat gejala"],
  encouragement: "Kamu sudah melakukan yang terbaik.",
};

const habitsInsightPayload = {
  summary: "Aktivitas minggu ini cukup konsisten",
  symptomAnalysis: "Kram ringan muncul di akhir minggu",
  tips: ["Tambah protein di sarapan", "Jalan santai 15 menit", "Catat mood harian"],
  motivation: "Langkah kecilmu sudah berarti.",
};

type CacheRow = {
  id: string;
  user_id: string;
  feature: string;
  generated_for_date: string;
  result: unknown;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

function parseEqFilters(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value.startsWith("eq.")) {
      filters[key] = decodeURIComponent(value.slice(3));
    }
  }
  return filters;
}

function createMockFetch(options: {
  userId: string | null;
  cacheStore: CacheRow[];
  openRouterFails?: boolean;
  invalidProviderPayload?: boolean;
  counters?: { openRouterCalls: number };
}) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/check_rate_limit" &&
      init?.method === "POST"
    ) {
      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: 99,
          reset_at: Math.ceil(Date.now() / 1000) + 60,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      if (!options.userId) {
        return new Response(JSON.stringify({ error: "invalid token" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          id: options.userId,
          email: `${options.userId}@example.com`,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "openrouter.ai" && url.pathname === "/api/v1/chat/completions") {
      if (options.counters) {
        options.counters.openRouterCalls += 1;
      }

      if (options.openRouterFails) {
        return new Response(JSON.stringify({ error: { message: "Provider unavailable" } }), {
          status: 502,
          headers: { "content-type": "application/json" },
        });
      }

      const requestBody = JSON.parse(String(init?.body || "{}"));
      const schemaName = requestBody?.response_format?.json_schema?.name;
      const payload = options.invalidProviderPayload
        ? { summary: "Output tidak lengkap" }
        : schemaName === "habits_insight"
          ? habitsInsightPayload
          : cycleReportPayload;

      return new Response(
        JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          choices: [{ message: { content: JSON.stringify(payload) } }],
          usage: { total_tokens: 120 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/ai_daily_generation_cache"
    ) {
      if (!init?.method || init.method === "GET") {
        const filters = parseEqFilters(url.searchParams);
        const matches = options.cacheStore.filter(
          (row) =>
            (!filters.user_id || row.user_id === filters.user_id) &&
            (!filters.feature || row.feature === filters.feature) &&
            (!filters.generated_for_date || row.generated_for_date === filters.generated_for_date),
        );

        const body = matches.length === 1 ? [matches[0]] : matches;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (init.method === "POST") {
        const rows = JSON.parse(String(init.body || "[]"));
        const inserted = (Array.isArray(rows) ? rows : [rows]).map((row) => {
          const saved: CacheRow = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: row.user_id,
            feature: row.feature,
            generated_for_date: row.generated_for_date,
            result: row.result,
            metadata: row.metadata ?? {},
          };
          options.cacheStore.push(saved);
          return saved;
        });

        return new Response(JSON.stringify(inserted.length === 1 ? inserted[0] : inserted), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };
}

const cycleReportRequestBody = {
  phase: "Folikular",
  cycleDay: 8,
  daysToNextPeriod: 20,
  fertilityWindow: { start: "2026-06-01", end: "2026-06-06" },
  cycleData: { "2026-06-01": { tasks: [], symptoms: [] } },
  nickname: "Maya",
};

const habitsInsightRequestBody = {
  weeklyData: [{ date: "2026-06-01", tasks: [], symptoms: [] }],
  currentPhase: "Luteal",
  nickname: "Maya",
};

test("generate-cycle-report rejects unauthenticated requests", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called for unauthenticated cycle report");
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-cycle-report",
    {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.21" },
      body: JSON.stringify(cycleReportRequestBody),
    },
    env,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing or invalid session" });
});

test("generate-habits-insight rejects unauthenticated requests", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called for unauthenticated habits insight");
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-habits-insight",
    {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.22" },
      body: JSON.stringify(habitsInsightRequestBody),
    },
    env,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing or invalid session" });
});

test("first cycle report calls provider and caches result", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-cycle-report",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-a-token",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.23",
      },
      body: JSON.stringify(cycleReportRequestBody),
    },
    env,
  );

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.cached, false);
  assert.equal(json.summary, cycleReportPayload.summary);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 1);
  assert.equal(cacheStore[0].user_id, USER_A);
  assert.equal(cacheStore[0].feature, "cycle_report");
  assert.equal(cacheStore[0].generated_for_date, getTodayDateKey());
});

test("second same-day cycle report returns cached result without provider call", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const headers = {
    authorization: "Bearer user-a-token",
    "content-type": "application/json",
    "cf-connecting-ip": "203.0.113.24",
  };

  const first = await app.request(
    "/api/generate-cycle-report",
    { method: "POST", headers, body: JSON.stringify(cycleReportRequestBody) },
    env,
  );
  assert.equal(first.status, 200);

  const second = await app.request(
    "/api/generate-cycle-report",
    { method: "POST", headers, body: JSON.stringify(cycleReportRequestBody) },
    env,
  );

  assert.equal(second.status, 200);
  const json = await second.json();
  assert.equal(json.cached, true);
  assert.equal(json.summary, cycleReportPayload.summary);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 1);
});

test("first habits insight calls provider and caches result", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-habits-insight",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-a-token",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.25",
      },
      body: JSON.stringify(habitsInsightRequestBody),
    },
    env,
  );

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.cached, false);
  assert.equal(json.summary, habitsInsightPayload.summary);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 1);
  assert.equal(cacheStore[0].feature, "habits_insight");
});

test("second same-day habits insight returns cached result without provider call", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const headers = {
    authorization: "Bearer user-a-token",
    "content-type": "application/json",
    "cf-connecting-ip": "203.0.113.26",
  };

  const first = await app.request(
    "/api/generate-habits-insight",
    { method: "POST", headers, body: JSON.stringify(habitsInsightRequestBody) },
    env,
  );
  assert.equal(first.status, 200);

  const second = await app.request(
    "/api/generate-habits-insight",
    { method: "POST", headers, body: JSON.stringify(habitsInsightRequestBody) },
    env,
  );

  assert.equal(second.status, 200);
  const json = await second.json();
  assert.equal(json.cached, true);
  assert.equal(json.summary, habitsInsightPayload.summary);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 1);
});

test("cycle report cache does not leak across users", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const requestAsUser = (token: string, ip: string) => {
    globalThis.fetch = createMockFetch({
      userId: token.includes("user-a") ? USER_A : USER_B,
      cacheStore,
      counters,
    });

    return app.request(
      "/api/generate-cycle-report",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "cf-connecting-ip": ip,
        },
        body: JSON.stringify(cycleReportRequestBody),
      },
      env,
    );
  };

  const first = await requestAsUser("user-a-token", "203.0.113.27");
  assert.equal(first.status, 200);

  const second = await requestAsUser("user-b-token", "203.0.113.28");

  assert.equal(second.status, 200);
  const json = await second.json();
  assert.equal(json.cached, false);
  assert.equal(counters.openRouterCalls, 2);
  assert.equal(cacheStore.length, 2);
  assert.equal(cacheStore.some((row) => row.user_id === USER_A), true);
  assert.equal(cacheStore.some((row) => row.user_id === USER_B), true);
});

test("provider failure does not cache cycle report success", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
    openRouterFails: true,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-cycle-report",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-a-token",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.29",
      },
      body: JSON.stringify(cycleReportRequestBody),
    },
    env,
  );

  assert.equal(response.status, 500);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 0);
});

test("invalid provider output does not cache cycle report success", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
    invalidProviderPayload: true,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-cycle-report",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-a-token",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.31",
      },
      body: JSON.stringify(cycleReportRequestBody),
    },
    env,
  );

  assert.equal(response.status, 500);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 0);
});

test("provider failure does not cache habits insight success", async (t) => {
  const originalFetch = globalThis.fetch;
  const cacheStore: CacheRow[] = [];
  const counters = { openRouterCalls: 0 };

  globalThis.fetch = createMockFetch({
    userId: USER_A,
    cacheStore,
    counters,
    openRouterFails: true,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/generate-habits-insight",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-a-token",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.30",
      },
      body: JSON.stringify(habitsInsightRequestBody),
    },
    env,
  );

  assert.equal(response.status, 500);
  assert.equal(counters.openRouterCalls, 1);
  assert.equal(cacheStore.length, 0);
});