import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  MAYAR_WEBHOOK_TOKEN: "valid-token",
};

test("topup webhook processes paid transaction through atomic RPC", async (t) => {
  const originalFetch = globalThis.fetch;
  const atomicRpcBodies: any[] = [];
  const directGrantBodies: any[] = [];
  const directTopupUpdates: any[] = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/ai_credit_topups") {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            id: "topup-1",
            user_id: "11111111-1111-4111-8111-111111111111",
            mayar_transaction_id: "tx-topup-1",
            credits_amount: 300,
            status: "pending",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (init.method === "PATCH") {
        directTopupUpdates.push(JSON.parse(String(init.body || "{}")));
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/rpc/grant_ai_credits") {
      directGrantBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response("300", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/rpc/process_paid_ai_credit_topup") {
      atomicRpcBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response(
        JSON.stringify({
          processed: true,
          status: "paid",
          balance: 300,
          topup_id: "topup-1",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
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
          id: "tx-topup-1",
          customerEmail: "maya@example.com",
          status: "paid",
        },
      }),
    },
    env
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(atomicRpcBodies.length, 1);
  assert.deepEqual(atomicRpcBodies[0], { p_mayar_transaction_id: "tx-topup-1" });
  assert.equal(directGrantBodies.length, 0);
  assert.equal(directTopupUpdates.length, 0);
});
