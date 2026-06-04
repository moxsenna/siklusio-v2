import test from "node:test";
import assert from "node:assert/strict";
import { isPaymentPendingUser } from "./paymentAccess";

test("detects checkout users that are still pending payment", () => {
  assert.equal(
    isPaymentPendingUser({
      app_metadata: { siklusio_access_status: "pending_payment" },
    }),
    true,
  );
});

test("does not block active or legacy users", () => {
  assert.equal(
    isPaymentPendingUser({
      app_metadata: { siklusio_access_status: "active" },
    }),
    false,
  );
  assert.equal(isPaymentPendingUser({ app_metadata: {} }), false);
  assert.equal(isPaymentPendingUser(null), false);
});
