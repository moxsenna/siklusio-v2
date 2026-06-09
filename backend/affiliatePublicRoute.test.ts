import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AFFILIATE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type Store = {
  affiliates: Array<Record<string, unknown>>;
  coupons: Array<Record<string, unknown>>;
  conversions: Array<Record<string, unknown>>;
  profile: Record<string, unknown>;
};

function createStore(): Store {
  return {
    affiliates: [
      {
        id: AFFILIATE_ID,
        email: "maya@example.com",
        name: "Maya",
        whatsapp: "08123456789",
        code: "MAYA10",
        commission_type: "percentage",
        commission_value: 40,
        is_active: true,
        bank_name: null,
        account_number: null,
        account_holder: null,
      },
    ],
    coupons: [
      {
        code: "MAYA10",
        is_active: true,
        discount_type: "percentage",
        discount_value: 10,
      },
    ],
    conversions: [
      {
        id: "conv-1",
        affiliate_id: AFFILIATE_ID,
        commission_amount: 3700,
        payout_status: "pending",
        created_at: "2026-06-08T00:00:00.000Z",
      },
    ],
    profile: {
      name: "Maya",
      whatsapp_number: "08123456789",
    },
  };
}

function parseEqFilters(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value.startsWith("eq.")) {
      filters[key] = decodeURIComponent(value.slice(3));
    }
  }
  return filters;
}

function createMockFetch(options: { userId?: string | null; store: Store; rpcErrorCode?: string }) {
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
        { status: 200, headers: { "content-type": "application/json" } },
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
          email: "maya@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      const filters = parseEqFilters(url.searchParams);
      if (filters.id === USER_ID) {
        return new Response(JSON.stringify(options.store.profile), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/affiliates") {
      if (!init?.method || init.method === "GET") {
        const filters = parseEqFilters(url.searchParams);
        const matches = options.store.affiliates.filter((row) => {
          if (filters.email && row.email !== filters.email) return false;
          if (filters.code && row.code !== filters.code) return false;
          if (filters.is_active === "true" && row.is_active !== true) return false;
          return true;
        });
        const body = matches.length === 1 ? [matches[0]] : matches;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (init.method === "PATCH") {
        const filters = parseEqFilters(url.searchParams);
        const body = JSON.parse(String(init.body || "{}"));
        const target = options.store.affiliates.find((row) => row.email === filters.email);
        if (target) Object.assign(target, body);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/coupons") {
      const filters = parseEqFilters(url.searchParams);
      const matches = options.store.coupons.filter((row) => {
        if (filters.code && row.code !== filters.code) return false;
        if (filters.is_active === "true" && row.is_active !== true) return false;
        return true;
      });
      const body = matches.length === 1 ? [matches[0]] : matches;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/affiliate_conversions"
    ) {
      const filters = parseEqFilters(url.searchParams);
      const matches = options.store.conversions.filter(
        (row) => !filters.affiliate_id || row.affiliate_id === filters.affiliate_id,
      );
      return new Response(JSON.stringify(matches), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/create_affiliate_with_coupon" &&
      init?.method === "POST"
    ) {
      if (options.rpcErrorCode) {
        return new Response(
          JSON.stringify({ code: options.rpcErrorCode, message: "duplicate key value" }),
          { status: 409, headers: { "content-type": "application/json" } },
        );
      }

      const args = JSON.parse(String(init.body || "{}"));
      const saved = {
        id: crypto.randomUUID(),
        code: args.p_code,
        email: args.p_email,
        name: args.p_name,
      };
      options.store.affiliates.push(saved);
      return new Response(JSON.stringify(saved), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };
}

test("GET /api/affiliate/validate works without authentication", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch({ store });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const invalid = await app.request("/api/affiliate/validate?code=UNKNOWN", { method: "GET" }, env);
  assert.equal(invalid.status, 200);
  assert.deepEqual(await invalid.json(), { valid: false });

  const valid = await app.request("/api/affiliate/validate?code=maya10", { method: "GET" }, env);
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { valid: true, discountLabel: "Diskon 10%" });
});

test("user-specific affiliate routes reject unauthenticated requests", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called for unauthenticated affiliate route");
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  for (const path of [
    "/api/affiliate/me",
    "/api/affiliate/me/conversions",
    "/api/affiliate/register",
  ]) {
    const response = await app.request(
      path,
      {
        method: path.endsWith("register") ? "POST" : "GET",
        headers: path.endsWith("register") ? { "content-type": "application/json" } : undefined,
        body: path.endsWith("register") ? JSON.stringify({ code: "NEW10" }) : undefined,
      },
      env,
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  }
});

test("authenticated user can read affiliate profile and conversions", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch({ userId: USER_ID, store });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const headers = { authorization: "Bearer user-token" };

  const me = await app.request("/api/affiliate/me", { method: "GET", headers }, env);
  assert.equal(me.status, 200);
  const meJson = await me.json();
  assert.equal(meJson.affiliate.code, "MAYA10");

  const conversions = await app.request(
    "/api/affiliate/me/conversions",
    { method: "GET", headers },
    env,
  );
  assert.equal(conversions.status, 200);
  const conversionsJson = await conversions.json();
  assert.equal(conversionsJson.conversions.length, 1);
  assert.equal(conversionsJson.conversions[0].id, "conv-1");
});

test("authenticated user can register affiliate code and update bank info", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch({ userId: USER_ID, store });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const headers = {
    authorization: "Bearer user-token",
    "content-type": "application/json",
  };

  const missingCode = await app.request(
    "/api/affiliate/register",
    { method: "POST", headers, body: JSON.stringify({}) },
    env,
  );
  assert.equal(missingCode.status, 400);
  assert.deepEqual(await missingCode.json(), { error: "Kode referal wajib diisi" });

  const register = await app.request(
    "/api/affiliate/register",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        code: " jas 10 ",
        bank_name: "BCA",
        account_number: "123",
        account_holder: "Maya",
      }),
    },
    env,
  );
  assert.equal(register.status, 200);
  const registerJson = await register.json();
  assert.equal(registerJson.affiliate.code, "JAS10");
  assert.equal(
    store.affiliates.some((row) => row.code === "JAS10"),
    true,
  );

  const bank = await app.request(
    "/api/affiliate/me/bank",
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        bank_name: "Mandiri",
        account_number: "999",
        account_holder: "Maya Updated",
      }),
    },
    env,
  );
  assert.equal(bank.status, 200);
  assert.deepEqual(await bank.json(), { status: "ok" });

  const updated = store.affiliates.find((row) => row.email === "maya@example.com");
  assert.equal(updated?.bank_name, "Mandiri");
  assert.equal(updated?.account_number, "999");
});

test("duplicate affiliate registration returns existing client error", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch({ userId: USER_ID, store, rpcErrorCode: "23505" });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/affiliate/register",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ code: "DUPLICATE" }),
    },
    env,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Kode referal sudah digunakan, pilih kode lain.",
  });
});
