import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

test("non-admin receives 403 on CRM endpoints", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({
          id: "user-uid",
          email: "user@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      // Mock profiles database query returning is_admin: false
      return new Response(JSON.stringify({ is_admin: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/admin/crm/summary",
    {
      method: "GET",
      headers: {
        authorization: "Bearer fake-token",
      },
    },
    env,
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("manual payment override requires validation and is idempotent", async (t) => {
  const originalFetch = globalThis.fetch;
  const updates: any[] = [];
  const inserts: any[] = [];
  let listUsersCalls = 0;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    // Authenticated user check
    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({
          id: "admin-uid",
          email: "admin@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Profile admin check
    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      return new Response(JSON.stringify({ is_admin: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Get Lead details
    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_leads") {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            id: "lead-123",
            name: "Bunda Test",
            email: "test@example.com",
            whatsapp: "08123456789",
            payment_status: "pending_payment",
            lead_status: "new_lead",
            user_id: "c0000000-0000-0000-0000-000000000123",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (init.method === "PATCH") {
        updates.push(JSON.parse(String(init.body || "{}")));
        return new Response(
          JSON.stringify({
            id: "lead-123",
            payment_status: "paid_manual",
            lead_status: "paid",
            user_id: "c0000000-0000-0000-0000-000000000123",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
    }

    // Check for existing pending registration
    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/pending_registrations"
    ) {
      // Mock: no pending registration found
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Check for existing payment override (for idempotency key check)
    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/admin_crm_payment_overrides"
    ) {
      if (!init?.method || init.method === "GET") {
        // First request: no duplicate override exists
        if (inserts.length === 0) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        // Second request: mock duplicate exists
        return new Response(
          JSON.stringify([
            {
              id: "override-123",
              idempotency_key: "manual_payment:lead-123:paid_manual:REF-123",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (init.method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        inserts.push(body);
        return new Response(JSON.stringify(body), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // Check/insert audit logs
    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_audit_logs") {
      return new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      (!init?.method || init.method === "GET")
    ) {
      listUsersCalls += 1;
      throw new Error("listUsers should not be called during admin manual payment activation");
    }

    // Get user by ID (for auth check in override)
    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users/c0000000-0000-0000-0000-000000000123" &&
      (!init?.method || init.method === "GET")
    ) {
      return new Response(
        JSON.stringify({
          user: {
            id: "c0000000-0000-0000-0000-000000000123",
            email: "test@example.com",
            app_metadata: { provider: "email" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Update user auth metadata
    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users/c0000000-0000-0000-0000-000000000123" &&
      init?.method === "PUT"
    ) {
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }

    // Check checkout sessions
    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Check credit ledger
    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/ai_credit_ledger") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // RPC grant credits
    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/grant_ai_credits"
    ) {
      return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. Validation test: Reference is required for paid/paid_manual activation if no pending registration exists
  const invalidRes = await app.request(
    "/api/admin/crm/leads/lead-123/payment-override",
    {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment_status: "paid_manual",
        reason: "Valid reason for payment override",
        reference: "",
        amount: 37000,
        should_activate_user: true,
      }),
    },
    env,
  );

  assert.equal(invalidRes.status, 400);
  assert.equal(
    (await invalidRes.json()).error,
    "Bukti pembayaran (reference) wajib diisi untuk aktivasi tanpa pending registration.",
  );

  // 2. Success first run: providing reference
  const successRes = await app.request(
    "/api/admin/crm/leads/lead-123/payment-override",
    {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment_status: "paid_manual",
        reason: "Valid reason for payment override",
        reference: "REF-123",
        amount: 37000,
        should_activate_user: true,
      }),
    },
    env,
  );

  assert.equal(successRes.status, 200);
  const data = await successRes.json();
  assert.equal(data.activationResult.paymentOverrideCreated, true);
  assert.equal(data.activationResult.userActivated, true);
  assert.equal(data.activationResult.creditsGranted, true);

  // 3. Idempotent second run
  const idempotentRes = await app.request(
    "/api/admin/crm/leads/lead-123/payment-override",
    {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment_status: "paid_manual",
        reason: "Valid reason for payment override",
        reference: "REF-123",
        amount: 37000,
        should_activate_user: true,
      }),
    },
    env,
  );

  assert.equal(idempotentRes.status, 200);
  const dataIdempotent = await idempotentRes.json();
  assert.equal(dataIdempotent.activationResult.paymentOverrideCreated, false);
  assert.equal(dataIdempotent.activationResult.userActivated, false);
  assert.deepEqual(dataIdempotent.activationResult.warnings, [
    "Permintaan ini sudah diproses sebelumnya (idempotency key cocok).",
  ]);
  assert.equal(listUsersCalls, 0);
});
