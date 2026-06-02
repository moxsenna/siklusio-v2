import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

const renderLogArgs = (args: unknown[]): string =>
  args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");

test("TWW calming reassurance requires an authenticated session before AI config", async () => {
  const response = await app.request(
    "/api/generate-calming-reassurance",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nickname: "Maya",
        userJournal: "Aku cemas menunggu hasil.",
      }),
    },
    {}
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing or invalid session" });
});

test("payment webhook refuses to process when webhook token is not configured", async () => {
  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "payment.success", email: "maya@example.com" }),
    },
    {}
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Webhook secret is not configured" });
});

test("payment webhook rejects invalid callback token", async () => {
  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "wrong-token",
      },
      body: JSON.stringify({ event: "payment.success", email: "maya@example.com" }),
    },
    { MAYAR_WEBHOOK_TOKEN: "correct-token" }
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized webhook request" });
});

test("payment webhook logs redact customer PII and payment URLs", async (t) => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const logs: string[] = [];

  console.log = (...args: unknown[]) => logs.push(renderLogArgs(args));
  console.warn = (...args: unknown[]) => logs.push(renderLogArgs(args));
  console.error = (...args: unknown[]) => logs.push(renderLogArgs(args));

  t.after(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
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
        event: "invoice.created",
        data: {
          customerEmail: "maya@example.com",
          link: "https://mayar.test/pay/tx-1",
          customer: {
            whatsapp: "08123456789",
          },
        },
      }),
    },
    { MAYAR_WEBHOOK_TOKEN: "valid-token" }
  );

  assert.equal(response.status, 200);
  const renderedLogs = logs.join("\n");
  assert.equal(renderedLogs.includes("maya@example.com"), false);
  assert.equal(renderedLogs.includes("https://mayar.test/pay/tx-1"), false);
  assert.equal(renderedLogs.includes("08123456789"), false);
});

test("AI endpoints reject repeated requests from the same client after rate limit is exceeded", async () => {
  const env = {
    AI_RATE_LIMIT_MAX: "1",
    AI_RATE_LIMIT_WINDOW_SECONDS: "60",
  };
  const headers = {
    "content-type": "application/json",
    "cf-connecting-ip": "203.0.113.10",
  };

  const first = await app.request(
    "/api/generate-calming-reassurance",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        nickname: "Maya",
        userJournal: "Aku cemas menunggu hasil.",
      }),
    },
    env
  );

  const second = await app.request(
    "/api/generate-calming-reassurance",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        nickname: "Maya",
        userJournal: "Aku cemas menunggu hasil.",
      }),
    },
    env
  );

  assert.equal(first.status, 401);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("Retry-After"), "60");
  assert.deepEqual(await second.json(), {
    error: "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
    retryAfterSeconds: 60,
  });
});

test("checkout endpoints reject repeated requests from the same client after rate limit is exceeded", async () => {
  const env = {
    CHECKOUT_RATE_LIMIT_MAX: "1",
    CHECKOUT_RATE_LIMIT_WINDOW_SECONDS: "60",
  };
  const headers = {
    "content-type": "application/json",
    "cf-connecting-ip": "203.0.113.11",
  };

  const first = await app.request(
    "/api/checkout/register",
    {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    },
    env
  );

  const second = await app.request(
    "/api/checkout/register",
    {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    },
    env
  );

  assert.equal(first.status, 400);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("Retry-After"), "60");
});
