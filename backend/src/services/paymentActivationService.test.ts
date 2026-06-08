import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAffiliateCommission,
  hasAffiliateConversionForTransaction,
} from "./paymentActivationService";

test("calculateAffiliateCommission returns zero for zero-amount orders when affiliate disallows it", () => {
  const commission = calculateAffiliateCommission(0, {
    id: "aff-1",
    commission_type: "percentage",
    commission_value: 10,
    allow_zero_order_commission: false,
  });

  assert.equal(commission, 0);
});

test("calculateAffiliateCommission applies percentage commission", () => {
  const commission = calculateAffiliateCommission(37000, {
    id: "aff-1",
    commission_type: "percentage",
    commission_value: 10,
    allow_zero_order_commission: false,
  });

  assert.equal(commission, 3700);
});

test("calculateAffiliateCommission applies flat commission", () => {
  const commission = calculateAffiliateCommission(37000, {
    id: "aff-1",
    commission_type: "flat",
    commission_value: 15000,
    allow_zero_order_commission: false,
  });

  assert.equal(commission, 15000);
});

test("hasAffiliateConversionForTransaction returns true when conversion exists", async () => {
  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "affiliate_conversions");
      return {
        select() {
          return this;
        },
        eq(column: string, value: string) {
          assert.equal(column, "mayar_transaction_id");
          assert.equal(value, "tx-duplicate");
          return this;
        },
        async maybeSingle() {
          return { data: { id: "conv-1" }, error: null };
        },
      };
    },
  };

  const exists = await hasAffiliateConversionForTransaction(supabaseAdmin as any, "tx-duplicate");
  assert.equal(exists, true);
});

test("hasAffiliateConversionForTransaction returns false when conversion does not exist", async () => {
  const supabaseAdmin = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
      };
    },
  };

  const exists = await hasAffiliateConversionForTransaction(supabaseAdmin as any, "tx-new");
  assert.equal(exists, false);
});