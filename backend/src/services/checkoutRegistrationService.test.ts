import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_CHECKOUT_AMOUNT,
  MIN_PAID_CHECKOUT_AMOUNT,
  applyCouponDiscount,
  enforceMinimumPaidAmount,
  normalizeAffiliateCodeInput,
  normalizeCouponCode,
  resolveValidatedTestEventCode,
} from "./checkoutRegistrationService";

test("normalizeCouponCode trims and uppercases coupon input", () => {
  assert.equal(normalizeCouponCode("  save10  "), "SAVE10");
});

test("normalizeAffiliateCodeInput trims and uppercases affiliate input", () => {
  assert.equal(normalizeAffiliateCodeInput(" aff10 "), "AFF10");
});

test("resolveValidatedTestEventCode returns code only when secret matches", () => {
  assert.equal(
    resolveValidatedTestEventCode({
      testEventCode: "TESTCODE",
      testSecret: "expected-secret",
      metaTestModeSecret: "expected-secret",
    }),
    "TESTCODE",
  );
  assert.equal(
    resolveValidatedTestEventCode({
      testEventCode: "TESTCODE",
      testSecret: "wrong-secret",
      metaTestModeSecret: "expected-secret",
    }),
    undefined,
  );
  assert.equal(
    resolveValidatedTestEventCode({
      testEventCode: "TESTCODE",
      testSecret: "expected-secret",
      metaTestModeSecret: undefined,
    }),
    undefined,
  );
});

test("applyCouponDiscount applies nominal and percentage discounts from base checkout amount", () => {
  assert.equal(
    applyCouponDiscount(BASE_CHECKOUT_AMOUNT, {
      discount_type: "nominal",
      discount_value: 7000,
    }),
    30000,
  );
  assert.equal(
    applyCouponDiscount(BASE_CHECKOUT_AMOUNT, {
      discount_type: "percentage",
      discount_value: 100,
    }),
    0,
  );
});

test("enforceMinimumPaidAmount keeps free checkout at zero and enforces minimum paid amount", () => {
  assert.equal(enforceMinimumPaidAmount(0), 0);
  assert.equal(enforceMinimumPaidAmount(5000), MIN_PAID_CHECKOUT_AMOUNT);
  assert.equal(enforceMinimumPaidAmount(BASE_CHECKOUT_AMOUNT), BASE_CHECKOUT_AMOUNT);
});