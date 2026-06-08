import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const ADMIN_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NON_ADMIN_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AFFILIATE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CONVERSION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

type Store = {
  affiliates: Array<Record<string, unknown>>;
  conversions: Array<Record<string, unknown>>;
};

function createStore(): Store {
  return {
    affiliates: [
      {
        id: AFFILIATE_ID,
        name: "Maya",
        email: "maya@example.com",
        whatsapp: "08123456789",
        code: "MAYA10",
        commission_type: "percentage",
        commission_value: 10,
        is_active: true,
        created_at: "2026-06-08T00:00:00.000Z",
      },
    ],
    conversions: [
      {
        id: CONVERSION_ID,
        affiliate_id: AFFILIATE_ID,
        payout_status: "pending",
        commission_amount: 3700,
        amount_paid: 37000,
        buyer_email: "buyer@example.com",
        buyer_name: "Buyer",
        buyer_whatsapp: "08111111111",
        created_at: "2026-06-08T00:00:00.000Z",
        affiliates: {
          name: "Maya",
          code: "MAYA10",
          email: "maya@example.com",
          whatsapp: "08123456789",
          bank_name: "BCA",
          account_number: "123",
          account_holder: "Maya",
        },
      },
    ],
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

function createMockFetch(isAdmin: boolean, store: Store, userId = isAdmin ? ADMIN_USER_ID : NON_ADMIN_USER_ID) {
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
      return new Response(
        JSON.stringify({
          id: userId,
          email: isAdmin ? "admin@example.com" : "user@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/profiles" &&
      url.search.includes("select=is_admin")
    ) {
      return new Response(JSON.stringify({ is_admin: isAdmin }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/affiliates") {
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify(store.affiliates), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (init.method === "POST") {
        const row = JSON.parse(String(init.body || "{}"));
        const saved = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          is_active: true,
          ...row,
        };
        store.affiliates.unshift(saved);
        return new Response(JSON.stringify(saved), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }

      if (init.method === "PATCH") {
        const filters = parseEqFilters(url.searchParams);
        const body = JSON.parse(String(init.body || "{}"));
        const target = store.affiliates.find((row) => row.id === filters.id);
        if (target) Object.assign(target, body);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }

      if (init.method === "DELETE") {
        const filters = parseEqFilters(url.searchParams);
        store.affiliates = store.affiliates.filter((row) => row.id !== filters.id);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/affiliate_conversions") {
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify(store.conversions), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (init.method === "PATCH") {
        const filters = parseEqFilters(url.searchParams);
        const body = JSON.parse(String(init.body || "{}"));
        const target = store.conversions.find((row) => row.id === filters.id);
        if (target) Object.assign(target, body);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };
}

test("affiliate admin routes reject unauthenticated requests", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called for unauthenticated affiliate admin route");
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/admin/affiliates",
    { method: "GET" },
    env,
  );

  assert.equal(response.status, 401);
});

test("affiliate admin routes reject authenticated non-admin requests", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch(false, store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/admin/affiliates",
    {
      method: "GET",
      headers: { authorization: "Bearer user-token" },
    },
    env,
  );

  assert.equal(response.status, 403);
});

test("admin can list affiliates and conversions", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch(true, store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const headers = { authorization: "Bearer admin-token" };

  const affiliatesRes = await app.request("/api/admin/affiliates", { method: "GET", headers }, env);
  assert.equal(affiliatesRes.status, 200);
  const affiliatesJson = await affiliatesRes.json();
  assert.equal(affiliatesJson.affiliates.length, 1);
  assert.equal(affiliatesJson.affiliates[0].code, "MAYA10");

  const conversionsRes = await app.request(
    "/api/admin/affiliates/conversions",
    { method: "GET", headers },
    env,
  );
  assert.equal(conversionsRes.status, 200);
  const conversionsJson = await conversionsRes.json();
  assert.equal(conversionsJson.conversions.length, 1);
  assert.equal(conversionsJson.conversions[0].id, CONVERSION_ID);
});

test("admin can create update and delete affiliate", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch(true, store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const headers = {
    authorization: "Bearer admin-token",
    "content-type": "application/json",
  };

  const invalidCreate = await app.request(
    "/api/admin/affiliates",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Incomplete" }),
    },
    env,
  );
  assert.equal(invalidCreate.status, 400);
  assert.deepEqual(await invalidCreate.json(), { error: "Data afiliasi tidak lengkap" });

  const createRes = await app.request(
    "/api/admin/affiliates",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Jasmine",
        email: "jasmine@example.com",
        whatsapp: "08129999999",
        code: " jas10 ",
        commission_type: "flat",
        commission_value: 5000,
      }),
    },
    env,
  );
  assert.equal(createRes.status, 200);
  const created = await createRes.json();
  assert.equal(created.affiliate.code, "JAS10");
  assert.equal(store.affiliates.length, 2);

  const updateRes = await app.request(
    `/api/admin/affiliates/${created.affiliate.id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_active: false, code: "IGNORED" }),
    },
    env,
  );
  assert.equal(updateRes.status, 200);
  assert.deepEqual(await updateRes.json(), { status: "ok" });
  const updated = store.affiliates.find((row) => row.id === created.affiliate.id);
  assert.equal(updated?.is_active, false);
  assert.equal(updated?.code, "JAS10");

  const deleteRes = await app.request(
    `/api/admin/affiliates/${created.affiliate.id}`,
    { method: "DELETE", headers },
    env,
  );
  assert.equal(deleteRes.status, 200);
  assert.deepEqual(await deleteRes.json(), { status: "ok" });
  assert.equal(store.affiliates.some((row) => row.id === created.affiliate.id), false);
});

test("admin can mark affiliate conversion payout as paid", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createStore();
  globalThis.fetch = createMockFetch(true, store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    `/api/admin/affiliates/conversions/${CONVERSION_ID}/payout`,
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payout_reference: "TRX-123",
        payout_note: "Paid via transfer",
      }),
    },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });

  const updated = store.conversions.find((row) => row.id === CONVERSION_ID);
  assert.equal(updated?.payout_status, "paid");
  assert.equal(updated?.payout_reference, "TRX-123");
  assert.equal(updated?.payout_note, "Paid via transfer");
  assert.equal(updated?.payout_marked_by, "admin@example.com");
});