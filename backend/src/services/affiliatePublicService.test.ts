import test from "node:test";
import assert from "node:assert/strict";
import {
  getAffiliateForUser,
  listAffiliateConversionsForUser,
  normalizePublicAffiliateCode,
  normalizeRegistrationAffiliateCode,
  registerPublicAffiliate,
  updateAffiliateBankForUser,
  validatePublicAffiliateCode,
  validateRegistrationCodeInput,
} from "./affiliatePublicService";

test("normalizePublicAffiliateCode and normalizeRegistrationAffiliateCode sanitize input", () => {
  assert.equal(normalizePublicAffiliateCode(" maya10 "), "MAYA10");
  assert.equal(normalizeRegistrationAffiliateCode(" maya 10 "), "MAYA10");
});

test("validateRegistrationCodeInput requires referral code", () => {
  assert.equal(validateRegistrationCodeInput(undefined), "Kode referal wajib diisi");
  assert.equal(validateRegistrationCodeInput("MAYA10"), null);
});

function createMockSupabase(handlers: {
  affiliates?: Array<Record<string, unknown>>;
  coupons?: Array<Record<string, unknown>>;
  conversions?: Array<Record<string, unknown>>;
  profile?: Record<string, unknown> | null;
  onRpc?: (args: Record<string, unknown>) => { data?: unknown; error?: { code?: string; message?: string } | null };
  onUpdateAffiliate?: (email: string | undefined, row: Record<string, unknown>) => void;
}) {
  const affiliates = [...(handlers.affiliates || [])];
  const coupons = [...(handlers.coupons || [])];
  const conversions = [...(handlers.conversions || [])];

  return {
    from(table: string) {
      if (table === "affiliates") {
        let emailFilter: string | undefined;
        let codeFilter: string | undefined;
        let activeFilter: boolean | undefined;

        const builder = {
          select() {
            return this;
          },
          eq(column: string, value: string | boolean) {
            if (column === "email") emailFilter = String(value);
            if (column === "code") codeFilter = String(value);
            if (column === "is_active") activeFilter = Boolean(value);
            return this;
          },
          order() {
            return this;
          },
          async maybeSingle() {
            const match = affiliates.find((row) => {
              if (emailFilter && row.email !== emailFilter) return false;
              if (codeFilter && row.code !== codeFilter) return false;
              if (activeFilter !== undefined && row.is_active !== activeFilter) return false;
              return true;
            });
            return { data: match ?? null, error: null };
          },
          update(row: Record<string, unknown>) {
            return {
              eq(column: string, email: string | undefined) {
                if (column === "email") {
                  handlers.onUpdateAffiliate?.(email, row);
                }
                return Promise.resolve({ error: null });
              },
            };
          },
        };

        return builder;
      }

      if (table === "coupons") {
        let codeFilter: string | undefined;
        let activeFilter: boolean | undefined;

        return {
          select() {
            return this;
          },
          eq(column: string, value: string | boolean) {
            if (column === "code") codeFilter = String(value);
            if (column === "is_active") activeFilter = Boolean(value);
            return this;
          },
          async maybeSingle() {
            const match = coupons.find((row) => {
              if (codeFilter && row.code !== codeFilter) return false;
              if (activeFilter !== undefined && row.is_active !== activeFilter) return false;
              return true;
            });
            return { data: match ?? null, error: null };
          },
        };
      }

      if (table === "profiles") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: handlers.profile ?? null, error: null };
          },
        };
      }

      if (table === "affiliate_conversions") {
        let affiliateIdFilter: string | undefined;

        return {
          select() {
            return this;
          },
          eq(column: string, value: string) {
            if (column === "affiliate_id") affiliateIdFilter = value;
            return this;
          },
          order() {
            return this;
          },
          async then(resolve: (value: { data: unknown[]; error: null }) => void) {
            const rows = conversions.filter(
              (row) => !affiliateIdFilter || row.affiliate_id === affiliateIdFilter,
            );
            resolve({ data: rows, error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc(_fn: string, args: Record<string, unknown>) {
      const result = handlers.onRpc?.(args) ?? { data: { id: "aff-new", code: args.p_code }, error: null };
      return Promise.resolve(result);
    },
  };
}

test("validatePublicAffiliateCode returns false for empty or inactive codes", async () => {
  const supabaseAdmin = createMockSupabase({
    affiliates: [{ code: "MAYA10", is_active: false, commission_type: "percentage", commission_value: 10 }],
  });

  assert.deepEqual(await validatePublicAffiliateCode(supabaseAdmin as any, ""), { valid: false });
  assert.deepEqual(await validatePublicAffiliateCode(supabaseAdmin as any, "UNKNOWN"), { valid: false });
});

test("validatePublicAffiliateCode returns discount label when coupon exists", async () => {
  const supabaseAdmin = createMockSupabase({
    affiliates: [
      { code: "MAYA10", is_active: true, commission_type: "percentage", commission_value: 10 },
    ],
    coupons: [{ code: "MAYA10", is_active: true, discount_type: "percentage", discount_value: 15 }],
  });

  const result = await validatePublicAffiliateCode(supabaseAdmin as any, " maya10 ");
  assert.deepEqual(result, { valid: true, discountLabel: "Diskon 15%" });
});

test("getAffiliateForUser and listAffiliateConversionsForUser scope data to user email", async () => {
  const supabaseAdmin = createMockSupabase({
    affiliates: [
      { id: "aff-1", email: "maya@example.com", code: "MAYA10", is_active: true },
      { id: "aff-2", email: "other@example.com", code: "OTHER", is_active: true },
    ],
    conversions: [
      { id: "conv-1", affiliate_id: "aff-1", commission_amount: 1000 },
      { id: "conv-2", affiliate_id: "aff-2", commission_amount: 2000 },
    ],
  });

  const affiliate = await getAffiliateForUser(supabaseAdmin as any, "maya@example.com");
  assert.equal(affiliate?.id, "aff-1");

  const conversions = await listAffiliateConversionsForUser(supabaseAdmin as any, "maya@example.com");
  assert.equal(conversions.length, 1);
  assert.equal((conversions[0] as { id: string }).id, "conv-1");
});

test("registerPublicAffiliate normalizes code and handles duplicate errors", async () => {
  let rpcArgs: Record<string, unknown> | undefined;
  const supabaseAdmin = createMockSupabase({
    profile: { name: "Maya", whatsapp_number: "08123456789" },
    onRpc: (args) => {
      rpcArgs = args;
      return { data: { id: "aff-new", code: args.p_code }, error: { code: "23505", message: "duplicate" } };
    },
  });

  const duplicate = await registerPublicAffiliate(
    supabaseAdmin as any,
    { id: "user-1", email: "maya@example.com" } as any,
    { code: " maya 10 " },
  );

  assert.equal(duplicate.ok, false);
  if (duplicate.ok === false) {
    assert.equal(duplicate.error, "Kode referal sudah digunakan, pilih kode lain.");
  }
  assert.equal(rpcArgs?.p_code, "MAYA10");
});

test("updateAffiliateBankForUser updates bank fields for user email", async () => {
  let updated: { email?: string; row?: Record<string, unknown> } = {};
  const supabaseAdmin = createMockSupabase({
    onUpdateAffiliate: (email, row) => {
      updated = { email, row };
    },
  });

  await updateAffiliateBankForUser(supabaseAdmin as any, "maya@example.com", {
    bank_name: "BCA",
    account_number: "123",
    account_holder: "Maya",
  });

  assert.equal(updated.email, "maya@example.com");
  assert.deepEqual(updated.row, {
    bank_name: "BCA",
    account_number: "123",
    account_holder: "Maya",
  });
});