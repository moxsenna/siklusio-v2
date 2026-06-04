import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  MAYAR_API_KEY: "mayar-key",
};

test("topup checkout uses server-owned package price and credits", async (t) => {
  const originalFetch = globalThis.fetch;
  const mayarBodies: any[] = [];
  const topupBodies: any[] = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({
          id: "11111111-1111-4111-8111-111111111111",
          email: "maya@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/profiles") {
      return new Response(
        JSON.stringify({
          name: "Maya",
          whatsapp_number: "08123456789",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "api.mayar.id" && url.pathname === "/hl/v1/payment/create") {
      mayarBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: { link: "https://mayar.test/pay/topup-1", id: "tx-topup-1" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/ai_credit_topups") {
      topupBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/checkout/topup",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        packageId: "coba_dulu",
        price: 1,
        credits: 999999,
      }),
    },
    env,
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(mayarBodies.length, 1);
  assert.equal(mayarBodies[0].amount, 9900);
  assert.equal(mayarBodies[0].name, "Top Up Kredit AI Siklusio (300 Kredit)");
  assert.equal(topupBodies.length, 1);
  assert.equal(topupBodies[0].amount_rp, 9900);
  assert.equal(topupBodies[0].credits_amount, 300);
});

test("topup checkout rejects unknown package ids before payment creation", async (t) => {
  const originalFetch = globalThis.fetch;
  let mayarCalled = false;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({
          id: "11111111-1111-4111-8111-111111111111",
          email: "maya@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "api.mayar.id") {
      mayarCalled = true;
    }

    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/checkout/topup",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        packageId: "paket_palsu",
      }),
    },
    env,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Paket topup tidak valid." });
  assert.equal(mayarCalled, false);
});
