import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAffiliateCommission,
  hasAffiliateConversionForTransaction,
  recordAdminManualAffiliateConversion,
  recordWebhookAffiliateConversion,
} from "./affiliateConversionService";

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

test("recordWebhookAffiliateConversion creates conversion once for paid checkout with affiliate code", async () => {
  const inserts: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    from(table: string) {
      if (table === "affiliates") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: {
                id: "aff-1",
                commission_type: "percentage",
                commission_value: 10,
                allow_zero_order_commission: false,
              },
              error: null,
            };
          },
        };
      }

      if (table === "affiliate_conversions") {
        return {
          insert(row: Record<string, unknown>) {
            inserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const result = await recordWebhookAffiliateConversion({
    supabaseAdmin: supabaseAdmin as any,
    affiliateCode: "AFF10",
    buyer: {
      name: "Buyer",
      email: "buyer@example.com",
      whatsapp: "08123456789",
    },
    session: {
      id: "session-1",
      final_amount: 37000,
      mayar_transaction_id: "tx-1",
    },
    mayarTransactionId: "tx-1",
  });

  assert.equal(result.created, true);
  assert.equal(result.commissionAmount, 3700);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].affiliate_id, "aff-1");
  assert.equal(inserts[0].commission_amount, 3700);
  assert.equal(inserts[0].mayar_transaction_id, "tx-1");
});

test("duplicate webhook affiliate conversion is idempotent", async () => {
  const supabaseAdmin = {
    from(table: string) {
      if (table === "affiliates") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: {
                id: "aff-1",
                commission_type: "percentage",
                commission_value: 10,
                allow_zero_order_commission: false,
              },
              error: null,
            };
          },
        };
      }

      if (table === "affiliate_conversions") {
        return {
          async insert() {
            return { error: { code: "23505", message: "duplicate key" } };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const result = await recordWebhookAffiliateConversion({
    supabaseAdmin: supabaseAdmin as any,
    affiliateCode: "AFF10",
    buyer: {
      email: "buyer@example.com",
    },
    session: { id: "session-1", final_amount: 37000 },
    mayarTransactionId: "tx-dup",
  });

  assert.equal(result.created, false);
  assert.equal(result.duplicate, true);
});

test("recordWebhookAffiliateConversion skips insert when affiliate code is unknown", async () => {
  let insertCalled = false;

  const supabaseAdmin = {
    from(table: string) {
      if (table === "affiliates") {
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
      }

      if (table === "affiliate_conversions") {
        return {
          async insert() {
            insertCalled = true;
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const result = await recordWebhookAffiliateConversion({
    supabaseAdmin: supabaseAdmin as any,
    affiliateCode: "UNKNOWN",
    buyer: { email: "buyer@example.com" },
    session: { id: "session-1", final_amount: 37000 },
    mayarTransactionId: "tx-1",
  });

  assert.equal(result.created, false);
  assert.equal(insertCalled, false);
});

test("recordAdminManualAffiliateConversion does not duplicate conversion for same buyer", async () => {
  const supabaseAdmin = {
    from(table: string) {
      if (table === "checkout_sessions") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return this;
          },
          async maybeSingle() {
            return {
              data: {
                id: "session-1",
                final_amount: 37000,
                mayar_transaction_id: null,
              },
              error: null,
            };
          },
        };
      }

      if (table === "affiliates") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: {
                id: "aff-1",
                commission_type: "percentage",
                commission_value: 10,
                allow_zero_order_commission: false,
              },
              error: null,
            };
          },
        };
      }

      if (table === "affiliate_conversions") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: { id: "conv-existing" }, error: null };
          },
          async insert() {
            throw new Error("insert should not be called when duplicate exists");
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const result = await recordAdminManualAffiliateConversion({
    supabaseAdmin: supabaseAdmin as any,
    affiliateCode: "aff10",
    email: "buyer@example.com",
    buyerName: "Buyer",
    buyerWhatsapp: "08123456789",
    amount: 37000,
  });

  assert.equal(result.created, false);
  assert.equal(result.duplicate, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.pendingCheckoutSession?.id, "session-1");
});

test("recordAdminManualAffiliateConversion creates conversion with existing commission rule", async () => {
  const inserts: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    from(table: string) {
      if (table === "checkout_sessions") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return this;
          },
          async maybeSingle() {
            return {
              data: {
                id: "session-1",
                final_amount: 37000,
                mayar_transaction_id: "tx-manual",
              },
              error: null,
            };
          },
        };
      }

      if (table === "affiliates") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: {
                id: "aff-1",
                commission_type: "percentage",
                commission_value: 10,
                allow_zero_order_commission: false,
              },
              error: null,
            };
          },
        };
      }

      if (table === "affiliate_conversions") {
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
          insert(row: Record<string, unknown>) {
            inserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const result = await recordAdminManualAffiliateConversion({
    supabaseAdmin: supabaseAdmin as any,
    affiliateCode: "AFF10",
    email: "buyer@example.com",
    buyerName: "Buyer",
    buyerWhatsapp: "08123456789",
  });

  assert.equal(result.created, true);
  assert.equal(result.commissionAmount, 3700);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].commission_amount, 3700);
  assert.equal(inserts[0].amount_paid, 37000);
});
