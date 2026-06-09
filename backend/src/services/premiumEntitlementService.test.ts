import test from "node:test";
import assert from "node:assert/strict";
import type { User } from "@supabase/supabase-js";
import {
  activatePendingAuthUser,
  activateResolvedAuthUserPremiumAccess,
  grantAdminManualPremiumEntitlement,
  grantPremiumCreditsForActivation,
  grantWebhookPremiumEntitlement,
} from "./premiumEntitlementService";

test("activatePendingAuthUser sets premium access_status to active", async () => {
  const updateBodies: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    auth: {
      admin: {
        async updateUserById(userId: string, body: Record<string, unknown>) {
          assert.equal(userId, "user-pending");
          updateBodies.push(body);
          return {
            data: { user: { id: userId, app_metadata: body.app_metadata } },
            error: null,
          };
        },
      },
    },
  };

  const user = await activatePendingAuthUser(supabaseAdmin as any, "user-pending");

  assert.equal(user?.id, "user-pending");
  assert.equal(updateBodies.length, 1);
  assert.deepEqual(updateBodies[0].app_metadata, { siklusio_access_status: "active" });
});

test("activateResolvedAuthUserPremiumAccess merges existing app_metadata", async () => {
  const updateBodies: Array<Record<string, unknown>> = [];
  const authUser = {
    id: "user-1",
    app_metadata: { provider: "email", siklusio_access_status: "pending" },
  } as unknown as User;

  const supabaseAdmin = {
    auth: {
      admin: {
        async updateUserById(userId: string, body: Record<string, unknown>) {
          assert.equal(userId, "user-1");
          updateBodies.push(body);
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
  };

  const result = await activateResolvedAuthUserPremiumAccess(supabaseAdmin as any, authUser);

  assert.equal(result.userActivated, true);
  assert.equal(result.alreadyActive, false);
  assert.deepEqual(updateBodies[0].app_metadata, {
    provider: "email",
    siklusio_access_status: "active",
  });
});

test("activateResolvedAuthUserPremiumAccess skips update when user already active", async () => {
  let updateCalled = false;
  const authUser = {
    id: "user-1",
    app_metadata: { siklusio_access_status: "active" },
  } as unknown as User;

  const supabaseAdmin = {
    auth: {
      admin: {
        async updateUserById() {
          updateCalled = true;
          return { data: { user: { id: "user-1" } }, error: null };
        },
      },
    },
  };

  const result = await activateResolvedAuthUserPremiumAccess(supabaseAdmin as any, authUser);

  assert.equal(result.userActivated, false);
  assert.equal(result.alreadyActive, true);
  assert.equal(updateCalled, false);
});

test("grantPremiumCreditsForActivation returns null when premium bonus already granted", async () => {
  const supabaseAdmin = {
    from(table: string) {
      assert.equal(table, "ai_credit_ledger");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: { id: "bonus-existing" }, error: null };
        },
      };
    },
    rpc() {
      throw new Error("grant_ai_credits should not be called when bonus already exists");
    },
  };

  const result = await grantPremiumCreditsForActivation(
    supabaseAdmin as any,
    "user-1",
    "session-1",
  );
  assert.equal(result, null);
});

test("grantWebhookPremiumEntitlement activates premium access and grants initial credits", async () => {
  let grantCreditCalls = 0;
  const authUpdates: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    auth: {
      admin: {
        async updateUserById(_userId: string, body: Record<string, unknown>) {
          authUpdates.push(body);
          return {
            data: { user: { id: "user-webhook" } },
            error: null,
          };
        },
      },
    },
    from(table: string) {
      if (table === "ai_credit_ledger") {
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
      throw new Error(`Unexpected table ${table}`);
    },
    async rpc(fn: string) {
      assert.equal(fn, "grant_ai_credits");
      grantCreditCalls += 1;
      return { data: 500, error: null };
    },
  };

  const result = await grantWebhookPremiumEntitlement({
    supabaseAdmin: supabaseAdmin as any,
    pendingUserId: "user-webhook",
    creditReferenceId: "session-1",
  });

  assert.equal(result.userId, "user-webhook");
  assert.equal(result.creditsGranted, true);
  assert.equal(grantCreditCalls, 1);
  assert.deepEqual(authUpdates[0].app_metadata, { siklusio_access_status: "active" });
});

test("duplicate webhook premium entitlement does not double-grant credits", async () => {
  let grantCreditCalls = 0;

  const supabaseAdmin = {
    auth: {
      admin: {
        async updateUserById() {
          return {
            data: { user: { id: "user-webhook" } },
            error: null,
          };
        },
      },
    },
    from(table: string) {
      if (table === "ai_credit_ledger") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: { id: "bonus-existing" }, error: null };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    async rpc() {
      grantCreditCalls += 1;
      return { data: 500, error: null };
    },
  };

  const result = await grantWebhookPremiumEntitlement({
    supabaseAdmin: supabaseAdmin as any,
    pendingUserId: "user-webhook",
    creditReferenceId: "session-1",
  });

  assert.equal(result.userId, "user-webhook");
  assert.equal(result.creditsGranted, false);
  assert.equal(grantCreditCalls, 0);
});

test("grantAdminManualPremiumEntitlement activates premium access for resolved auth user", async () => {
  let grantCreditCalls = 0;
  const authUpdates: Array<Record<string, unknown>> = [];

  const supabaseAdmin = {
    auth: {
      admin: {
        async getUserById(userId: string) {
          return {
            data: {
              user: {
                id: userId,
                app_metadata: { provider: "email", siklusio_access_status: "pending" },
              },
            },
            error: null,
          };
        },
        async updateUserById(userId: string, body: Record<string, unknown>) {
          assert.equal(userId, "11111111-1111-4111-8111-111111111111");
          authUpdates.push(body);
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
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
            return { data: { id: "session-admin" }, error: null };
          },
        };
      }
      if (table === "ai_credit_ledger") {
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
      throw new Error(`Unexpected table ${table}`);
    },
    async rpc(fn: string) {
      assert.equal(fn, "grant_ai_credits");
      grantCreditCalls += 1;
      return { data: 500, error: null };
    },
  };

  const result = await grantAdminManualPremiumEntitlement({
    supabaseAdmin: supabaseAdmin as any,
    authUserId: "11111111-1111-4111-8111-111111111111",
    email: "buyer@example.com",
  });

  assert.equal(result.activatedUserId, "11111111-1111-4111-8111-111111111111");
  assert.equal(result.userActivated, true);
  assert.equal(result.creditsGranted, true);
  assert.equal(result.warnings.length, 0);
  assert.equal(grantCreditCalls, 1);
  assert.deepEqual(authUpdates[0].app_metadata, {
    provider: "email",
    siklusio_access_status: "active",
  });
});

test("grantAdminManualPremiumEntitlement returns safe warning when auth user is missing", async () => {
  let grantCreditCalls = 0;

  const supabaseAdmin = {
    auth: {
      admin: {
        async getUserById() {
          return { data: { user: null }, error: null };
        },
      },
    },
    from(table: string) {
      if (table === "pending_registrations") {
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
      if (table === "admin_crm_leads") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          not() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return this;
          },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    async rpc() {
      grantCreditCalls += 1;
      return { data: 500, error: null };
    },
  };

  const result = await grantAdminManualPremiumEntitlement({
    supabaseAdmin: supabaseAdmin as any,
    authUserId: null,
    email: "missing@example.com",
  });

  assert.equal(result.activatedUserId, null);
  assert.equal(result.userActivated, false);
  assert.equal(result.creditsGranted, false);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /user terdaftar \(auth\) tidak ditemukan/);
  assert.equal(grantCreditCalls, 0);
});
