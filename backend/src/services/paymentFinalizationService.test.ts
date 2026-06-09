import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanupAdminManualPendingRegistration,
  deleteWebhookPendingRegistration,
  markAdminManualCheckoutSessionPaid,
  markCheckoutSessionPaid,
  syncWebhookPaymentCrmLead,
} from "./paymentFinalizationService";

test("markCheckoutSessionPaid updates checkout session with paid status and transaction id", async () => {
  const updates: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "checkout_sessions");
      return {
        update(body: Record<string, unknown>) {
          updates.push(body);
          return {
            eq(column: string, value: string) {
              assert.equal(column, "id");
              assert.equal(value, "session-1");
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  await markCheckoutSessionPaid(
    supabaseAdmin as any,
    { id: "session-1", mayar_transaction_id: "tx-existing" },
    "tx-webhook",
  );

  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "paid");
  assert.equal(updates[0].mayar_transaction_id, "tx-existing");
  assert.ok(updates[0].paid_at);
});

test("markAdminManualCheckoutSessionPaid marks affiliate checkout session paid", async () => {
  const updates: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "checkout_sessions");
      return {
        update(body: Record<string, unknown>) {
          updates.push(body);
          return {
            eq(column: string, value: string) {
              assert.equal(column, "id");
              assert.equal(value, "session-admin");
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await markAdminManualCheckoutSessionPaid(supabaseAdmin as any, "session-admin");

  assert.equal(result.updated, true);
  assert.equal(updates[0].status, "paid");
  assert.equal("mayar_transaction_id" in updates[0], false);
});

test("deleteWebhookPendingRegistration removes pending registration after webhook success", async () => {
  let deletedId: string | null = null;

  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "pending_registrations");
      return {
        delete() {
          return {
            eq(column: string, value: string) {
              assert.equal(column, "id");
              deletedId = value;
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  await deleteWebhookPendingRegistration(supabaseAdmin as any, "pending-1");
  assert.equal(deletedId, "pending-1");
});

test("cleanupAdminManualPendingRegistration returns cleaned flag on success", async () => {
  const supabaseAdmin = {
    from() {
      return {
        delete() {
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await cleanupAdminManualPendingRegistration(supabaseAdmin as any, "pending-1");
  assert.equal(result.cleaned, true);
});

test("cleanupAdminManualPendingRegistration returns cleaned false when delete fails", async () => {
  const supabaseAdmin = {
    from() {
      return {
        delete() {
          return {
            eq() {
              return Promise.resolve({ error: { message: "delete failed" } });
            },
          };
        },
      };
    },
  };

  const result = await cleanupAdminManualPendingRegistration(supabaseAdmin as any, "pending-1");
  assert.equal(result.cleaned, false);
});

test("syncWebhookPaymentCrmLead upserts paid CRM lead for webhook payment", async () => {
  const rpcCalls: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    async rpc(fn: string, args: Record<string, unknown>) {
      assert.equal(fn, "admin_crm_upsert_lead");
      rpcCalls.push(args);
      return { data: {}, error: null };
    },
  };

  await syncWebhookPaymentCrmLead(supabaseAdmin as any, {
    userId: "user-1",
    pending: {
      id: "pending-1",
      user_id: "user-1",
      email: "buyer@example.com",
      name: "Buyer",
      whatsapp: "08123456789",
      coupon_code: "COUP10",
      affiliate_code: "AFF10",
    },
    mayarTransactionId: "tx-1",
    fallbackAmount: 37000,
  });

  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].p_payment_status, "paid");
  assert.equal(rpcCalls[0].p_lead_status, "paid");
  assert.equal(rpcCalls[0].p_mayar_transaction_id, "tx-1");
  assert.equal(rpcCalls[0].p_amount, 37000);
});

test("syncWebhookPaymentCrmLead fails soft when CRM upsert errors", async () => {
  const supabaseAdmin = {
    async rpc() {
      return { data: null, error: { message: "crm failed" } };
    },
  };

  await assert.doesNotReject(() =>
    syncWebhookPaymentCrmLead(supabaseAdmin as any, {
      userId: "user-1",
      pending: {
        id: "pending-1",
        user_id: "user-1",
        email: "buyer@example.com",
      },
      mayarTransactionId: "tx-1",
    }),
  );
});
