import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsUserProperties } from "./analyticsIdentity";

test("buildAnalyticsUserProperties labels active checkout users without exposing PII", () => {
  const properties = buildAnalyticsUserProperties({
    id: "user-1",
    email: "maya@example.com",
    app_metadata: {
      provider: "email",
      siklusio_access_status: "active",
    },
    user_metadata: {
      name: "Maya",
      whatsapp: "08123456789",
    },
  });

  assert.deepEqual(properties, {
    access_status: "active",
    auth_provider: "email",
    is_payment_pending: false,
  });
  assert.equal(JSON.stringify(properties).includes("maya@example.com"), false);
  assert.equal(JSON.stringify(properties).includes("08123456789"), false);
});

test("buildAnalyticsUserProperties labels pending payment users", () => {
  assert.deepEqual(
    buildAnalyticsUserProperties({
      id: "user-2",
      app_metadata: {
        provider: "email",
        siklusio_access_status: "pending_payment",
      },
      user_metadata: {},
    }),
    {
      access_status: "pending_payment",
      auth_provider: "email",
      is_payment_pending: true,
    },
  );
});

test("buildAnalyticsUserProperties clears properties for signed out users", () => {
  assert.deepEqual(buildAnalyticsUserProperties(null), {});
});
