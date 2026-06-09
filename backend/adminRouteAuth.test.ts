import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const ADMIN_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NON_ADMIN_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function isAdminProfileLookup(url: URL) {
  return (
    url.hostname === "project.supabase.co" &&
    url.pathname === "/rest/v1/profiles" &&
    (url.searchParams.get("select") === "is_admin" || url.search.includes("select=is_admin"))
  );
}

function mockAuthFetch(isAdmin: boolean, userId = isAdmin ? ADMIN_USER_ID : NON_ADMIN_USER_ID) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({
          id: userId,
          email: isAdmin ? "admin@example.com" : "user@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (isAdminProfileLookup(url)) {
      return new Response(JSON.stringify({ is_admin: isAdmin }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_leads") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/admin/users") {
      return new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/coupons") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/affiliates") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/whatsapp_autoresponder_settings"
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };
}

const adminEndpoints = [
  { method: "GET", path: "/api/admin/users" },
  { method: "GET", path: "/api/admin/coupons" },
  {
    method: "POST",
    path: "/api/admin/coupons",
    body: { code: "TEST10", discount_type: "percentage", discount_value: 10 },
  },
  { method: "GET", path: "/api/admin/affiliates" },
  { method: "GET", path: "/api/admin/affiliates/conversions" },
  { method: "GET", path: "/api/admin/crm/summary" },
  { method: "GET", path: "/api/admin/crm/leads" },
  { method: "GET", path: "/api/admin/whatsapp/settings" },
  { method: "GET", path: "/api/admin/whatsapp/logs" },
] as const;

for (const endpoint of adminEndpoints) {
  test(`${endpoint.method} ${endpoint.path} rejects unauthenticated requests`, async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("fetch should not be called for unauthenticated admin route");
    };

    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const response = await app.request(
      endpoint.path,
      {
        method: endpoint.method,
        headers: "body" in endpoint ? { "content-type": "application/json" } : undefined,
        body: "body" in endpoint ? JSON.stringify(endpoint.body) : undefined,
      },
      env,
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Missing or invalid session" });
  });

  test(`${endpoint.method} ${endpoint.path} rejects authenticated non-admin requests`, async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockAuthFetch(false);

    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const response = await app.request(
      endpoint.path,
      {
        method: endpoint.method,
        headers: {
          authorization: "Bearer user-token",
          ...("body" in endpoint ? { "content-type": "application/json" } : {}),
        },
        body: "body" in endpoint ? JSON.stringify(endpoint.body) : undefined,
      },
      env,
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
  });

  test(`${endpoint.method} ${endpoint.path} allows authenticated admin requests`, async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockAuthFetch(true);

    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const response = await app.request(
      endpoint.path,
      {
        method: endpoint.method,
        headers: {
          authorization: "Bearer admin-token",
          ...("body" in endpoint ? { "content-type": "application/json" } : {}),
        },
        body: "body" in endpoint ? JSON.stringify(endpoint.body) : undefined,
      },
      env,
    );

    assert.notEqual(response.status, 401);
    assert.notEqual(response.status, 403);
  });
}

test("admin route middleware performs a single is_admin lookup for successful admin requests", async (t) => {
  const originalFetch = globalThis.fetch;
  let isAdminLookups = 0;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (isAdminProfileLookup(url)) {
      isAdminLookups += 1;
      return new Response(JSON.stringify({ is_admin: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return mockAuthFetch(true)(input, init);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/admin/coupons",
    {
      method: "GET",
      headers: { authorization: "Bearer admin-token" },
    },
    env,
  );

  assert.notEqual(response.status, 401);
  assert.notEqual(response.status, 403);
  assert.equal(isAdminLookups, 1);
});
