import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const ADMIN_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NON_ADMIN_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
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

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };
}

const adminEndpoints = [
  { method: "GET", path: "/api/admin/users" },
  { method: "GET", path: "/api/admin/coupons" },
  { method: "GET", path: "/api/admin/crm/summary" },
  { method: "GET", path: "/api/admin/affiliates" },
  { method: "GET", path: "/api/admin/whatsapp/settings" },
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
      { method: endpoint.method },
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
        headers: { authorization: "Bearer user-token" },
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
        headers: { authorization: "Bearer admin-token" },
      },
      env,
    );

    assert.notEqual(response.status, 401);
    assert.notEqual(response.status, 403);
  });
}