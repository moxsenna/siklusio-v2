import test from "node:test";
import assert from "node:assert/strict";
import {
  retryPaidSessionPurchaseMetaCapi,
  scheduleAdminManualPaymentAutoresponder,
  scheduleMayarWebhookPaymentAutoresponder,
  sendWebhookPurchaseMetaCapi,
} from "./paymentNotificationService";

function buildBindingsContext(waitUntilCalls: Array<Promise<unknown>>) {
  return {
    env: {
      VITE_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      META_PIXEL_ID: "pixel-123",
      META_CAPI_ACCESS_TOKEN: "token-123",
      META_GRAPH_API_VERSION: "v19.0",
    },
    executionCtx: {
      waitUntil(promise: Promise<unknown>) {
        waitUntilCalls.push(promise);
      },
    },
  };
}

test("sendWebhookPurchaseMetaCapi sends Purchase event and marks checkout session", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalls = 0;
  let sessionUpdate: Record<string, unknown> | null = null;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.hostname === "graph.facebook.com") {
      capiCalls += 1;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "checkout_sessions");
      return {
        update(body: Record<string, unknown>) {
          sessionUpdate = body;
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await sendWebhookPurchaseMetaCapi({
    c: buildBindingsContext([]) as any,
    supabaseAdmin: supabaseAdmin as any,
    session: {
      id: "session-1",
      final_amount: 37000,
      hashed_email: "hashed-email",
      hashed_phone: "hashed-phone",
      meta_test_event_code: "TESTCODE",
    },
    email: "buyer@example.com",
    pending: {
      id: "pending-1",
      email: "buyer@example.com",
      whatsapp: "08123456789",
    },
    mayarTransactionId: "tx-1",
  });

  assert.equal(result.capiSuccess, true);
  assert.equal(result.eventId, "purchase_tx-1");
  assert.equal(capiCalls, 1);
  assert.equal(sessionUpdate?.purchase_capi_event_id, "purchase_tx-1");
  assert.ok(sessionUpdate?.purchase_capi_sent_at);
});

test("sendWebhookPurchaseMetaCapi marks session done when Meta env is missing", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalls = 0;
  let sessionUpdate: Record<string, unknown> | null = null;

  globalThis.fetch = async () => {
    capiCalls += 1;
    throw new Error("CAPI should not be called when Meta env is missing");
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const supabaseAdmin = {
    from() {
      return {
        update(body: Record<string, unknown>) {
          sessionUpdate = body;
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await sendWebhookPurchaseMetaCapi({
    c: {
      env: {},
      executionCtx: { waitUntil() {} },
    } as any,
    supabaseAdmin: supabaseAdmin as any,
    session: { id: "session-1", final_amount: 37000 },
    email: "buyer@example.com",
    pending: { id: "pending-1", email: "buyer@example.com" },
    mayarTransactionId: "tx-1",
  });

  assert.equal(result.capiSuccess, true);
  assert.equal(capiCalls, 0);
  assert.equal(sessionUpdate?.purchase_capi_event_id, "purchase_tx-1");
});

test("retryPaidSessionPurchaseMetaCapi retries Purchase for paid session without prior CAPI", async (t) => {
  const originalFetch = globalThis.fetch;
  let capiCalls = 0;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.hostname === "graph.facebook.com") {
      capiCalls += 1;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const supabaseAdmin = {
    from() {
      return {
        update() {
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await retryPaidSessionPurchaseMetaCapi({
    c: buildBindingsContext([]) as any,
    supabaseAdmin: supabaseAdmin as any,
    session: {
      id: "session-paid",
      final_amount: 37000,
      mayar_transaction_id: "tx-dup-1",
      hashed_email: "hashed-email",
      meta_test_event_code: "TESTCODE",
    },
    mayarTransactionId: "tx-dup-1",
  });

  assert.equal(result.capiSuccess, true);
  assert.equal(result.eventId, "purchase_tx-dup-1");
  assert.equal(capiCalls, 1);
});

test("scheduleMayarWebhookPaymentAutoresponder uses waitUntil for background execution", () => {
  const waitUntilCalls: Array<Promise<unknown>> = [];

  scheduleMayarWebhookPaymentAutoresponder({
    c: buildBindingsContext(waitUntilCalls) as any,
    session: {
      id: "session-1",
      email: "buyer@example.com",
      whatsapp: "08123456789",
      final_amount: 37000,
      mayar_transaction_id: "tx-1",
    },
    pending: {
      id: "pending-1",
      email: "buyer@example.com",
      whatsapp: "08123456789",
    },
    mayarTransactionId: "tx-1",
  });

  assert.equal(waitUntilCalls.length, 1);
});

test("scheduleAdminManualPaymentAutoresponder uses waitUntil for background execution", () => {
  const waitUntilCalls: Array<Promise<unknown>> = [];

  scheduleAdminManualPaymentAutoresponder({
    c: buildBindingsContext(waitUntilCalls) as any,
    lead: {
      id: "lead-1",
      name: "Buyer",
      email: "buyer@example.com",
      whatsapp: "08123456789",
    },
    overrideId: "override-1",
    finalReference: "REF-1",
    amount: 37000,
  });

  assert.equal(waitUntilCalls.length, 1);
});
