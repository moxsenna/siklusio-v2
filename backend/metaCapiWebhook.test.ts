import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  MAYAR_API_KEY: "mayar-key",
  MAYAR_WEBHOOK_TOKEN: "valid-token",
  META_PIXEL_ID: "pixel-123",
  META_CAPI_ACCESS_TOKEN: "token-123",
  META_GRAPH_API_VERSION: "v19.0",
};

test("Paid webhook with no affiliate still sends Purchase", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiPayload: any = null;
  let sessionUpdateBody: any = null;
  let userActivated = false;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    // Supabase query mocks
    if (url.hostname === "project.supabase.co") {
      // 1. Pending registration query
      if (url.pathname === "/rest/v1/pending_registrations") {
        if (init?.method === "GET") {
          return new Response(
            JSON.stringify({
              id: "pending-1",
              user_id: "11111111-1111-4111-8111-111111111111",
              email: "buyer@example.com",
              name: "Buyer",
              whatsapp: "08123456789",
              affiliate_code: null,
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (init?.method === "DELETE") {
          return new Response("", { status: 204 });
        }
      }

      // 2. Checkout session query
      if (url.pathname === "/rest/v1/checkout_sessions") {
        if (init?.method === "GET") {
          return new Response(
            JSON.stringify({
              id: "session-123",
              email: "buyer@example.com",
              whatsapp: "08123456789",
              final_amount: 37000,
              mayar_transaction_id: "tx-123",
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
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (init?.method === "PATCH") {
          sessionUpdateBody = JSON.parse(String(init.body || "{}"));
          return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        }
      }

      // 3. User activation mock
      if (url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111" && init?.method === "PUT") {
        userActivated = true;
        return new Response(
          JSON.stringify({ user: { id: "11111111-1111-4111-8111-111111111111", app_metadata: { siklusio_access_status: "active" } } }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // 4. Initial credits mock
      if (url.pathname === "/rest/v1/ai_credit_ledger" || url.pathname === "/rest/v1/rpc/grant_ai_credits") {
        return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
      }

      // 5. Affiliate conversion mock
      if (url.pathname === "/rest/v1/affiliate_conversions") {
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    // Facebook CAPI mock
    if (url.hostname === "graph.facebook.com") {
      capiPayload = JSON.parse(String(init?.body || "{}"));
      return new Response(JSON.stringify({ success: true }), {
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
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "valid-token",
      },
      body: JSON.stringify({
        event: "payment.success",
        data: {
          id: "tx-123",
          customerEmail: "buyer@example.com",
        },
      }),
    },
    env
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(userActivated, true);
  assert.ok(capiPayload);
  assert.ok(sessionUpdateBody);

  // Assert CAPI Graph API payload
  const event = capiPayload.data[0];
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, "purchase_tx-123");
  assert.equal(event.action_source, "website");
  assert.equal(event.custom_data.currency, "IDR");
  assert.equal(event.custom_data.value, 37000);
  assert.deepEqual(event.custom_data.content_ids, ["siklusio_premium_lifetime"]);
  assert.equal(event.custom_data.order_id, "tx-123");
  assert.deepEqual(event.user_data.em, ["hashed-email-val"]);
  assert.deepEqual(event.user_data.ph, ["hashed-phone-val"]);
  assert.equal(event.user_data.fbp, "fbp-val");
  assert.equal(event.user_data.fbc, "fbc-val");
  assert.equal(event.user_data.client_ip_address, "127.0.0.1");
  assert.equal(event.user_data.client_user_agent, "Mozilla");
  assert.equal(capiPayload.test_event_code, "TESTCODE");

  // Assert checkout_sessions updated with tracking information
  assert.ok(sessionUpdateBody.purchase_capi_sent_at);
  assert.equal(sessionUpdateBody.purchase_capi_event_id, "purchase_tx-123");
});

test("Paid webhook duplicate with purchase_capi_sent_at does not send again", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalled = false;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/checkout_sessions") {
        if (init?.method === "GET") {
          return new Response(
            JSON.stringify({
              id: "session-123",
              email: "buyer@example.com",
              status: "paid",
              purchase_capi_sent_at: "2026-06-05T12:00:00Z",
              purchase_capi_event_id: "purchase_tx-123",
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
      }
      if (url.pathname === "/rest/v1/ai_credit_topups") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "graph.facebook.com") {
      capiCalled = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "valid-token",
      },
      body: JSON.stringify({
        event: "payment.success",
        data: {
          id: "tx-123",
          customerEmail: "buyer@example.com",
        },
      }),
    },
    env
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(capiCalled, false);
});

test("Paid webhook duplicate with paid session but null purchase_capi_sent_at retries CAPI", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalled = false;
  let sessionUpdateBody: any = null;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/checkout_sessions") {
        if (init?.method === "GET") {
          return new Response(
            JSON.stringify({
              id: "session-123",
              email: "buyer@example.com",
              whatsapp: "08123456789",
              final_amount: 37000,
              mayar_transaction_id: "tx-123",
              status: "paid",
              hashed_email: "hashed-email-val",
              hashed_phone: "hashed-phone-val",
              fbp: "fbp-val",
              fbc: "fbc-val",
              client_ip_address: "127.0.0.1",
              client_user_agent: "Mozilla",
              meta_test_event_code: "TESTCODE",
              purchase_capi_sent_at: null,
              purchase_capi_event_id: null,
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (init?.method === "PATCH") {
          sessionUpdateBody = JSON.parse(String(init.body || "{}"));
          return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        }
      }
      if (url.pathname === "/rest/v1/ai_credit_topups") {
        return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "graph.facebook.com") {
      capiCalled = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "valid-token",
      },
      body: JSON.stringify({
        event: "payment.success",
        data: {
          id: "tx-123",
          customerEmail: "buyer@example.com",
        },
      }),
    },
    env
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(capiCalled, true);
  assert.ok(sessionUpdateBody);
  assert.ok(sessionUpdateBody.purchase_capi_sent_at);
  assert.equal(sessionUpdateBody.purchase_capi_event_id, "purchase_tx-123");
});

test("Meta env missing should not break paid activation", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalled = false;
  let userActivated = false;

  // Environment without META configurations
  const envMissingMeta = {
    VITE_SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    MAYAR_API_KEY: "mayar-key",
    MAYAR_WEBHOOK_TOKEN: "valid-token",
  };

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/pending_registrations") {
        if (init?.method === "GET") {
          return new Response(
            JSON.stringify({
              id: "pending-1",
              user_id: "11111111-1111-4111-8111-111111111111",
              email: "buyer@example.com",
              name: "Buyer",
              whatsapp: "08123456789",
              affiliate_code: null,
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (init?.method === "DELETE") {
          return new Response("", { status: 204 });
        }
      }

      if (url.pathname === "/rest/v1/checkout_sessions") {
        if (init?.method === "GET") {
          return new Response(
            JSON.stringify({
              id: "session-123",
              email: "buyer@example.com",
              whatsapp: "08123456789",
              final_amount: 37000,
              mayar_transaction_id: "tx-123",
              status: "pending",
              hashed_email: "hashed-email-val",
              hashed_phone: "hashed-phone-val",
              fbp: null,
              fbc: null,
              client_ip_address: null,
              client_user_agent: null,
              meta_test_event_code: null,
              purchase_capi_sent_at: null,
              purchase_capi_event_id: null,
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (init?.method === "PATCH") {
          return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        }
      }

      if (url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111" && init?.method === "PUT") {
        userActivated = true;
        return new Response(
          JSON.stringify({ user: { id: "11111111-1111-4111-8111-111111111111", app_metadata: { siklusio_access_status: "active" } } }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.pathname === "/rest/v1/ai_credit_ledger" || url.pathname === "/rest/v1/rpc/grant_ai_credits") {
        return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "graph.facebook.com") {
      capiCalled = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "valid-token",
      },
      body: JSON.stringify({
        event: "payment.success",
        data: {
          id: "tx-123",
          customerEmail: "buyer@example.com",
        },
      }),
    },
    envMissingMeta
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(userActivated, true);
  assert.equal(capiCalled, false); // No CAPI graph calls must happen when configs are missing
});

test("Paid webhook updates only matched checkout session when same email has multiple pending sessions", async (t) => {
  const originalFetch = globalThis.fetch;
  const patchUrls: string[] = [];
  let userActivated = false;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co") {
      if (url.pathname === "/rest/v1/pending_registrations") {
        if (init?.method === "GET") {
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
        if (init?.method === "DELETE") {
          return new Response("", { status: 204 });
        }
      }

      if (url.pathname === "/rest/v1/checkout_sessions") {
        if (init?.method === "GET") {
          const txFilter = url.searchParams.get("mayar_transaction_id");
          if (txFilter === "eq.tx-paid") {
            return new Response(
              JSON.stringify({
                id: "session-paid",
                email: "buyer@example.com",
                whatsapp: "08123456789",
                final_amount: 37000,
                mayar_transaction_id: "tx-paid",
                status: "pending",
                hashed_email: "hashed-email-val",
                hashed_phone: "hashed-phone-val",
                fbp: null,
                fbc: null,
                client_ip_address: null,
                client_user_agent: null,
                meta_test_event_code: null,
                purchase_capi_sent_at: null,
                purchase_capi_event_id: null,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          return new Response("null", {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (init?.method === "PATCH") {
          patchUrls.push(url.toString());
          return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        }
      }

      if (url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111" && init?.method === "PUT") {
        userActivated = true;
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

      if (url.pathname === "/rest/v1/ai_credit_ledger" || url.pathname === "/rest/v1/rpc/grant_ai_credits") {
        return new Response("500", { status: 200, headers: { "content-type": "application/json" } });
      }

      if (url.pathname === "/rest/v1/affiliate_conversions") {
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.hostname === "graph.facebook.com") {
      return new Response(JSON.stringify({ success: true }), {
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
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "valid-token",
      },
      body: JSON.stringify({
        event: "payment.success",
        data: {
          id: "tx-paid",
          customerEmail: "buyer@example.com",
        },
      }),
    },
    env,
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(userActivated, true);
  assert.ok(patchUrls.length >= 1);

  for (const patchUrl of patchUrls) {
    assert.match(patchUrl, /id=eq\.session-paid/);
    assert.equal(patchUrl.includes("email=eq."), false);
    assert.equal(patchUrl.includes("status=eq.pending"), false);
  }
});
