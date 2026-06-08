import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const webhookEnv = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  MAYAR_WEBHOOK_TOKEN: "valid-token",
  META_PIXEL_ID: "pixel-123",
  META_CAPI_ACCESS_TOKEN: "token-123",
  META_GRAPH_API_VERSION: "v19.0",
};

const adminEnv = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

type Store = {
  affiliateConversions: Array<{ mayar_transaction_id: string | null; affiliate_id: string }>;
  whatsappLogs: Array<{ idempotency_key: string }>;
  grantCreditCalls: number;
  fonnteCalls: number;
  capiCalls: number;
  session: Record<string, unknown>;
  pendingDeleted: boolean;
};

function createWebhookStore(): Store {
  return {
    affiliateConversions: [],
    whatsappLogs: [],
    grantCreditCalls: 0,
    fonnteCalls: 0,
    capiCalls: 0,
    session: {
      id: "session-paid",
      email: "buyer@example.com",
      whatsapp: "08123456789",
      final_amount: 37000,
      mayar_transaction_id: "tx-dup-1",
      status: "pending",
      hashed_email: "hashed-email-val",
      hashed_phone: "hashed-phone-val",
      fbp: "fbp-val",
      fbc: "fbc-val",
      client_ip_address: "127.0.0.1",
      client_user_agent: "Mozilla",
      meta_test_event_code: "TESTCODE",
      purchase_capi_sent_at: null,
      purchase_capi_event_id: null,
    },
    pendingDeleted: false,
  };
}

function mockRateLimitResponse() {
  return new Response(
    JSON.stringify({
      allowed: true,
      remaining: 99,
      reset_at: Math.ceil(Date.now() / 1000) + 60,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function buildWebhookMock(store: Store) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/check_rate_limit" &&
      init?.method === "POST"
    ) {
      return mockRateLimitResponse();
    }

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/ai_credit_topups") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.pathname === "/rest/v1/pending_registrations") {
        if (!init?.method || init.method === "GET") {
          if (store.pendingDeleted) {
            return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
          }
          return new Response(
            JSON.stringify({
              id: "pending-1",
              user_id: "11111111-1111-4111-8111-111111111111",
              email: "buyer@example.com",
              name: "Buyer",
              whatsapp: "08123456789",
              affiliate_code: "AFF10",
              coupon_code: null,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (init.method === "DELETE") {
          store.pendingDeleted = true;
          return new Response("", { status: 204 });
        }
      }

      if (url.pathname === "/rest/v1/checkout_sessions") {
        if (!init?.method || init.method === "GET") {
          return new Response(JSON.stringify(store.session), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (init.method === "PATCH") {
          const body = JSON.parse(String(init.body || "{}"));
          Object.assign(store.session, body);
          if (body.status === "paid") {
            store.session.status = "paid";
          }
          return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        }
      }

      if (url.pathname === "/rest/v1/affiliate_conversions") {
        if (!init?.method || init.method === "GET") {
          const tx = url.searchParams.get("mayar_transaction_id")?.replace(/^eq\./, "");
          const matches = store.affiliateConversions.filter((row) =>
            tx ? row.mayar_transaction_id === tx : true,
          );
          const body = matches.length === 1 ? matches[0] : matches;
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (init.method === "POST") {
          const row = JSON.parse(String(init.body || "{}"));
          store.affiliateConversions.push(row);
          return new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
        }
      }

      if (url.pathname === "/rest/v1/affiliates") {
        return new Response(
          JSON.stringify({
            id: "aff-1",
            commission_type: "percentage",
            commission_value: 10,
            allow_zero_order_commission: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.pathname === "/rest/v1/whatsapp_autoresponder_logs") {
        if (!init?.method || init.method === "GET") {
          const key = url.searchParams.get("idempotency_key")?.replace(/^eq\./, "");
          const found = store.whatsappLogs.find((row) => row.idempotency_key === key);
          return new Response(JSON.stringify(found ? [found] : []), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (init.method === "POST") {
          const row = JSON.parse(String(init.body || "{}"));
          store.whatsappLogs.push(row);
          return new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
        }
      }

      if (url.pathname === "/rest/v1/whatsapp_autoresponder_settings") {
        return new Response(
          JSON.stringify({
            event_key: "payment_completed",
            is_enabled: false,
            message_template: "Halo {{nama}}",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (
        url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111" &&
        init?.method === "PUT"
      ) {
        return new Response(
          JSON.stringify({
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              app_metadata: { siklusio_access_status: "active" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.pathname === "/rest/v1/ai_credit_ledger") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.pathname === "/rest/v1/rpc/grant_ai_credits") {
        store.grantCreditCalls += 1;
        return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.pathname === "/rest/v1/rpc/admin_crm_upsert_lead") {
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "graph.facebook.com") {
      store.capiCalls += 1;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "api.fonnte.com") {
      store.fonnteCalls += 1;
      return new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };
}

async function postWebhook(body: Record<string, unknown>) {
  return app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "valid-token",
      },
      body: JSON.stringify(body),
    },
    webhookEnv,
  );
}

test("duplicate paid webhook does not double-grant premium credits", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createWebhookStore();
  globalThis.fetch = buildWebhookMock(store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = {
    event: "payment.success",
    data: { id: "tx-dup-1", customerEmail: "buyer@example.com" },
  };

  const first = await postWebhook(payload);
  assert.equal(first.status, 200);
  assert.equal(store.grantCreditCalls, 1);

  const second = await postWebhook(payload);
  assert.equal(second.status, 200);
  assert.equal(store.grantCreditCalls, 1);
  assert.equal((await second.json()).message, "Transaction already processed");
});

test("duplicate paid webhook does not double-create affiliate conversion", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createWebhookStore();
  globalThis.fetch = buildWebhookMock(store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = {
    event: "payment.success",
    data: { id: "tx-dup-1", customerEmail: "buyer@example.com" },
  };

  await postWebhook(payload);
  assert.equal(store.affiliateConversions.length, 1);

  const second = await postWebhook(payload);
  assert.equal(second.status, 200);
  assert.equal(store.affiliateConversions.length, 1);
});

test("duplicate paid webhook does not call WhatsApp provider again after first success", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createWebhookStore();
  globalThis.fetch = buildWebhookMock(store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = {
    event: "payment.success",
    data: { id: "tx-dup-1", customerEmail: "buyer@example.com" },
  };

  await postWebhook(payload);
  const firstFonnteCalls = store.fonnteCalls;

  const second = await postWebhook(payload);
  assert.equal(second.status, 200);
  assert.equal(store.fonnteCalls, firstFonnteCalls);
});

test("paid webhook sends Meta CAPI once and recovery path only when purchase_capi_sent_at is null", async (t) => {
  const originalFetch = globalThis.fetch;
  const store = createWebhookStore();
  globalThis.fetch = buildWebhookMock(store);

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = {
    event: "payment.success",
    data: { id: "tx-dup-1", customerEmail: "buyer@example.com" },
  };

  const first = await postWebhook(payload);
  assert.equal(first.status, 200);
  assert.equal(store.capiCalls, 1);
  assert.ok(store.session.purchase_capi_sent_at);

  const second = await postWebhook(payload);
  assert.equal(second.status, 200);
  assert.equal(store.capiCalls, 1);

  store.session.purchase_capi_sent_at = null;
  store.session.purchase_capi_event_id = null;
  store.pendingDeleted = true;

  const recovery = await postWebhook(payload);
  assert.equal(recovery.status, 200);
  assert.equal(store.capiCalls, 2);
  assert.equal((await recovery.json()).message, "CAPI retry processed");
});

test("admin manual premium activation does not send Meta CAPI Purchase", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalls = 0;
  let listUsersCalls = 0;
  const authUpdateBodies: Array<Record<string, unknown>> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      (!init?.method || init.method === "GET")
    ) {
      listUsersCalls += 1;
      throw new Error("listUsers should not be called during admin manual payment activation");
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/check_rate_limit" &&
      init?.method === "POST"
    ) {
      return mockRateLimitResponse();
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({ id: "admin-uid", email: "admin@example.com" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      return new Response(JSON.stringify({ is_admin: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_leads") {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            id: "lead-456",
            name: "Buyer",
            email: "buyer@example.com",
            whatsapp: "08123456789",
            payment_status: "pending_payment",
            lead_status: "new_lead",
            user_id: "11111111-1111-4111-8111-111111111111",
            affiliate_code: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (init.method === "PATCH") {
        return new Response(
          JSON.stringify({
            id: "lead-456",
            payment_status: "paid_manual",
            lead_status: "paid",
            user_id: "11111111-1111-4111-8111-111111111111",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/pending_registrations") {
      return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_payment_overrides") {
      if (!init?.method || init.method === "GET") {
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (init.method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        return new Response(JSON.stringify({ id: "override-456", ...body }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      if (init.method === "PATCH") {
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_audit_logs") {
      return new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111"
    ) {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "buyer@example.com",
              app_metadata: { provider: "email", siklusio_access_status: "pending" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (init.method === "PUT") {
        authUpdateBodies.push(JSON.parse(String(init.body || "{}")));
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/ai_credit_ledger") {
      return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/rpc/grant_ai_credits") {
      return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "graph.facebook.com") {
      capiCalls += 1;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/admin/crm/leads/lead-456/payment-override",
    {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment_status: "paid_manual",
        reason: "Valid reason for payment override",
        reference: "REF-456",
        amount: 37000,
        should_activate_user: true,
      }),
    },
    adminEnv,
  );

  assert.equal(response.status, 200);
  assert.equal(capiCalls, 0);
  assert.equal(authUpdateBodies.length, 1);
  assert.equal((authUpdateBodies[0].app_metadata as any).provider, "email");
  assert.equal((authUpdateBodies[0].app_metadata as any).siklusio_access_status, "active");
  assert.equal(listUsersCalls, 0);
});

test("admin manual activation resolves auth user via pending registration without listUsers", async (t) => {
  const originalFetch = globalThis.fetch;
  let listUsersCalls = 0;
  const authUpdateBodies: Array<Record<string, unknown>> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      (!init?.method || init.method === "GET")
    ) {
      listUsersCalls += 1;
      throw new Error("listUsers should not be called during admin manual payment activation");
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/check_rate_limit" &&
      init?.method === "POST"
    ) {
      return mockRateLimitResponse();
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({ id: "admin-uid", email: "admin@example.com" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      return new Response(JSON.stringify({ is_admin: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_leads") {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            id: "lead-pending-only",
            name: "Buyer",
            email: "buyer@example.com",
            whatsapp: "08123456789",
            payment_status: "pending_payment",
            lead_status: "new_lead",
            user_id: null,
            affiliate_code: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (init.method === "PATCH") {
        return new Response(
          JSON.stringify({
            id: "lead-pending-only",
            payment_status: "paid_manual",
            lead_status: "paid",
            user_id: "11111111-1111-4111-8111-111111111111",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/pending_registrations") {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            id: "pending-lookup",
            user_id: "11111111-1111-4111-8111-111111111111",
            email: "buyer@example.com",
            name: "Buyer",
            whatsapp: "08123456789",
            affiliate_code: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (init.method === "DELETE") {
        return new Response("", { status: 204 });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_payment_overrides") {
      if (!init?.method || init.method === "GET") {
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (init.method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        return new Response(JSON.stringify({ id: "override-pending", ...body }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      if (init.method === "PATCH") {
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/admin_crm_audit_logs") {
      return new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111"
    ) {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "buyer@example.com",
              app_metadata: { provider: "email", siklusio_access_status: "pending" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (init.method === "PUT") {
        authUpdateBodies.push(JSON.parse(String(init.body || "{}")));
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/ai_credit_ledger") {
      return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/rpc/grant_ai_credits") {
      return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/admin/crm/leads/lead-pending-only/payment-override",
    {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment_status: "paid_manual",
        reason: "Valid reason for payment override",
        reference: "REF-PENDING",
        amount: 37000,
        should_activate_user: true,
      }),
    },
    adminEnv,
  );

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.activationResult.userActivated, true);
  assert.equal(authUpdateBodies.length, 1);
  assert.equal(listUsersCalls, 0);
});

test("webhook premium credit grant failure returns 500 instead of false success", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/check_rate_limit" &&
      init?.method === "POST"
    ) {
      return mockRateLimitResponse();
    }

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/ai_credit_topups") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/rest/v1/checkout_sessions") {
        return new Response(
          JSON.stringify({
            id: "session-grant-fail",
            email: "buyer@example.com",
            final_amount: 37000,
            mayar_transaction_id: "tx-grant-fail",
            status: "pending",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/rest/v1/affiliate_conversions") {
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/rest/v1/pending_registrations") {
        return new Response(
          JSON.stringify({
            id: "pending-1",
            user_id: "11111111-1111-4111-8111-111111111111",
            email: "buyer@example.com",
            name: "Buyer",
            whatsapp: "08123456789",
            affiliate_code: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (
        url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111" &&
        init?.method === "PUT"
      ) {
        return new Response(
          JSON.stringify({
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              app_metadata: { siklusio_access_status: "active" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/rest/v1/ai_credit_ledger") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/rest/v1/rpc/grant_ai_credits") {
        return new Response(
          JSON.stringify({ message: "grant failed", code: "PGRST500" }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await postWebhook({
    event: "payment.success",
    data: { id: "tx-grant-fail", customerEmail: "buyer@example.com" },
  });

  assert.equal(response.status, 500);
  const json = await response.json();
  assert.ok(json.error);
});

test("webhook auth activation failure returns 500 instead of false success", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/check_rate_limit" &&
      init?.method === "POST"
    ) {
      return mockRateLimitResponse();
    }

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/ai_credit_topups") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/rest/v1/checkout_sessions") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/rest/v1/affiliate_conversions") {
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/rest/v1/pending_registrations") {
        return new Response(
          JSON.stringify({
            id: "pending-1",
            user_id: "11111111-1111-4111-8111-111111111111",
            email: "buyer@example.com",
            name: "Buyer",
            whatsapp: "08123456789",
            affiliate_code: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (
        url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111" &&
        init?.method === "PUT"
      ) {
        return new Response(JSON.stringify({ error: "activation failed" }), { status: 500 });
      }
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await postWebhook({
    event: "payment.success",
    data: { id: "tx-fail-auth", customerEmail: "buyer@example.com" },
  });

  assert.equal(response.status, 500);
  const json = await response.json();
  assert.match(String(json.error), /Auth user activation failed/i);
});