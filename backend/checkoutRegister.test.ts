import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const renderLogArgs = (args: unknown[]): string =>
  args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");

const env = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  MAYAR_API_KEY: "mayar-key",
};

test("paid checkout stores pending registration without plaintext password", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const pendingBodies: any[] = [];
  const authCreateBodies: any[] = [];
  const checkoutSessionsBodies: any[] = [];
  const logs: string[] = [];

  console.log = (...args: unknown[]) => logs.push(renderLogArgs(args));

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      (!init?.method || init.method === "GET")
    ) {
      return new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      init?.method === "POST"
    ) {
      authCreateBodies.push(JSON.parse(String(init.body || "{}")));
      return new Response(
        JSON.stringify({
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "maya@example.com",
            app_metadata: {},
            user_metadata: {},
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/pending_registrations"
    ) {
      pendingBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      checkoutSessionsBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "api.mayar.id" && url.pathname === "/hl/v1/invoice/create") {
      const mayarBody = JSON.parse(String(init?.body || "{}"));
      assert.equal(mayarBody.name, "Maya");
      assert.equal(mayarBody.email, "maya@example.com");
      assert.equal(mayarBody.mobile, "08123456789");
      assert.equal(mayarBody.description, "Akses selamanya Siklusio Premium: pelacak ovulasi, AI insight, komunitas aman, dan fitur promil.");
      assert.equal(mayarBody.items[0].description, "Siklusio Premium Lifetime");
      assert.equal(mayarBody.extraData.noCustomer, "maya@example.com");
      assert.equal(mayarBody.extraData.idProd, "siklusio_premium_lifetime");
      assert.equal(mayarBody.extraData.productName, "Siklusio Premium Lifetime");

      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            link: "https://mayar.test/pay/tx-1",
            id: "invoice-123",
            transactionId: "trx_123",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  });

  const response = await app.request(
    "/api/checkout/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Maya",
        email: "maya@example.com",
        whatsapp: "08123456789",
        password: "secret123",
      }),
    },
    env,
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(authCreateBodies.length, 1);
  assert.equal(authCreateBodies[0].password, "secret123");
  assert.equal(pendingBodies.length, 1);
  assert.equal("password" in pendingBodies[0], false);
  assert.equal(pendingBodies[0].email, "maya@example.com");
  assert.equal(pendingBodies[0].user_id, "11111111-1111-4111-8111-111111111111");

  const renderedLogs = logs.join("\n");
  assert.equal(renderedLogs.includes("https://mayar.test/pay/tx-1"), false);
  assert.equal(renderedLogs.includes("trx_123"), false);
  assert.equal(renderedLogs.includes("maya@example.com"), false);

  assert.equal(checkoutSessionsBodies.length, 1);
  assert.equal(checkoutSessionsBodies[0].mayar_transaction_id, "trx_123");
  assert.equal(checkoutSessionsBodies[0].mayar_link, "https://mayar.test/pay/tx-1");
});

test("payment webhook activates existing pending auth user instead of creating one from a password", async (t) => {
  const originalFetch = globalThis.fetch;
  const authCreateBodies: any[] = [];
  const authUpdateBodies: any[] = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/pending_registrations"
    ) {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({
            id: "pending-1",
            user_id: "11111111-1111-4111-8111-111111111111",
            email: "maya@example.com",
            name: "Maya",
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

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/admin/users") {
      authCreateBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response(
        JSON.stringify({
          user: {
            id: "created-user-should-not-happen",
            email: "maya@example.com",
            app_metadata: {},
            user_metadata: {},
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
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
              email: "maya@example.com",
              app_metadata: { provider: "email" },
              user_metadata: {},
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (init.method === "PUT") {
        authUpdateBodies.push(JSON.parse(String(init.body || "{}")));
        return new Response(
          JSON.stringify({
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "maya@example.com",
              app_metadata: authUpdateBodies.at(-1)?.app_metadata || {},
              user_metadata: {},
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      return new Response(JSON.stringify({ id: "checkout-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/ai_credit_ledger") {
      return new Response("null", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/rpc/grant_ai_credits"
    ) {
      return new Response("500", {
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
        email: "maya@example.com",
      }),
    },
    {
      ...env,
      MAYAR_WEBHOOK_TOKEN: "valid-token",
    },
  );

  const responseText = await response.text();
  assert.equal(response.status, 200, responseText);
  assert.equal(authCreateBodies.length, 0);
  assert.equal(authUpdateBodies.length, 1);
  assert.equal(authUpdateBodies[0].app_metadata.siklusio_access_status, "active");
});

test("paid checkout does not return payment URL when checkout session insert fails", async (t) => {
  const originalFetch = globalThis.fetch;
  const deletedAuthUserIds: string[] = [];
  let deletedPendingRegistration = false;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      (!init?.method || init.method === "GET")
    ) {
      return new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      init?.method === "POST"
    ) {
      return new Response(
        JSON.stringify({
          user: {
            id: "22222222-2222-4222-8222-222222222222",
            email: "maya@example.com",
            app_metadata: {},
            user_metadata: {},
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users/22222222-2222-4222-8222-222222222222" &&
      init?.method === "DELETE"
    ) {
      deletedAuthUserIds.push("22222222-2222-4222-8222-222222222222");
      return new Response(
        JSON.stringify({ user: { id: "22222222-2222-4222-8222-222222222222" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/pending_registrations"
    ) {
      if (init?.method === "POST") {
        return new Response("{}", {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }

      if (init?.method === "DELETE") {
        deletedPendingRegistration = true;
        return new Response("", { status: 204 });
      }
    }

    if (url.hostname === "api.mayar.id" && url.pathname === "/hl/v1/invoice/create") {
      const mayarBody = JSON.parse(String(init?.body || "{}"));
      assert.equal(mayarBody.name, "Maya");
      assert.equal(mayarBody.email, "maya@example.com");

      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            link: "https://mayar.test/pay/tx-2",
            id: "invoice-234",
            transactionId: "trx_234",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      return new Response(JSON.stringify({ message: "insert failed" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()} ${init?.method || "GET"}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/checkout/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Maya",
        email: "maya@example.com",
        whatsapp: "08123456789",
        password: "secret123",
      }),
    },
    env,
  );

  const payload = await response.json();
  assert.equal(response.status, 500);
  assert.equal("paymentUrl" in payload, false);
  assert.equal(payload.error, "Gagal mencatat sesi pembayaran. Silakan coba kembali.");
  assert.deepEqual(deletedAuthUserIds, ["22222222-2222-4222-8222-222222222222"]);
  assert.equal(deletedPendingRegistration, true);
});

async function registerCheckoutWithMetaTestFields(
  t: { after: (fn: () => void) => void },
  options: {
    env: Record<string, string>;
    body: Record<string, unknown>;
  },
) {
  const originalFetch = globalThis.fetch;
  const checkoutSessionsBodies: any[] = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      (!init?.method || init.method === "GET")
    ) {
      return new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/auth/v1/admin/users" &&
      init?.method === "POST"
    ) {
      return new Response(
        JSON.stringify({
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "maya@example.com",
            app_metadata: {},
            user_metadata: {},
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url.hostname === "project.supabase.co" &&
      url.pathname === "/rest/v1/pending_registrations"
    ) {
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "project.supabase.co" && url.pathname === "/rest/v1/checkout_sessions") {
      checkoutSessionsBodies.push(JSON.parse(String(init?.body || "{}")));
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "api.mayar.id" && url.pathname === "/hl/v1/invoice/create") {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            link: "https://mayar.test/pay/tx-1",
            id: "invoice-123",
            transactionId: "trx_123",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/checkout/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.body),
    },
    options.env,
  );

  return { response, checkoutSessionsBodies };
}

test("checkout register ignores test_event_code when META_TEST_MODE_SECRET is missing", async (t) => {
  const { response, checkoutSessionsBodies } = await registerCheckoutWithMetaTestFields(t, {
    env,
    body: {
      name: "Maya",
      email: "maya@example.com",
      whatsapp: "08123456789",
      password: "secret123",
      test_event_code: "TESTCODE",
      test_secret: "anything",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(checkoutSessionsBodies.length, 1);
  assert.equal(checkoutSessionsBodies[0].meta_test_event_code, null);
});

test("checkout register ignores test_event_code when test_secret does not match", async (t) => {
  const { response, checkoutSessionsBodies } = await registerCheckoutWithMetaTestFields(t, {
    env: { ...env, META_TEST_MODE_SECRET: "expected-secret" },
    body: {
      name: "Maya",
      email: "maya@example.com",
      whatsapp: "08123456789",
      password: "secret123",
      test_event_code: "TESTCODE",
      test_secret: "wrong-secret",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(checkoutSessionsBodies.length, 1);
  assert.equal(checkoutSessionsBodies[0].meta_test_event_code, null);
});

test("checkout register stores test_event_code only when test_secret matches META_TEST_MODE_SECRET", async (t) => {
  const { response, checkoutSessionsBodies } = await registerCheckoutWithMetaTestFields(t, {
    env: { ...env, META_TEST_MODE_SECRET: "expected-secret" },
    body: {
      name: "Maya",
      email: "maya@example.com",
      whatsapp: "08123456789",
      password: "secret123",
      test_event_code: "TESTCODE",
      test_secret: "expected-secret",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(checkoutSessionsBodies.length, 1);
  assert.equal(checkoutSessionsBodies[0].meta_test_event_code, "TESTCODE");
});
