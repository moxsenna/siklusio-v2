import test from "node:test";
import assert from "node:assert/strict";
import { redactLogValue } from "./redaction";

test("redactLogValue removes PII, payment URLs, and secrets from nested log payloads", () => {
  const redacted = redactLogValue({
    email: "maya@example.com",
    customer: {
      customerName: "Maya Puspita",
      whatsapp: "08123456789",
      paymentUrl: "https://mayar.test/pay/tx-1",
    },
    authorization: "Bearer secret-token",
    note: "Payment for maya@example.com at https://mayar.test/pay/tx-1",
    safeStatus: "paid",
  });

  const rendered = JSON.stringify(redacted);

  assert.equal(rendered.includes("maya@example.com"), false);
  assert.equal(rendered.includes("Maya Puspita"), false);
  assert.equal(rendered.includes("08123456789"), false);
  assert.equal(rendered.includes("https://mayar.test/pay/tx-1"), false);
  assert.equal(rendered.includes("secret-token"), false);
  assert.equal(rendered.includes("paid"), true);
});
