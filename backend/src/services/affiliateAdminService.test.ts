import test from "node:test";
import assert from "node:assert/strict";
import {
  AFFILIATE_UPDATE_ALLOWED_FIELDS,
  createAffiliate,
  deleteAffiliate,
  listAffiliateConversions,
  listAffiliates,
  markAffiliateConversionPaid,
  pickAffiliateUpdateFields,
  updateAffiliate,
  validateCreateAffiliateInput,
  type UpdateAffiliateInput,
} from "./affiliateAdminService";

test("validateCreateAffiliateInput rejects incomplete affiliate payload", () => {
  assert.equal(
    validateCreateAffiliateInput({
      name: "Maya",
      email: "maya@example.com",
    }),
    "Data afiliasi tidak lengkap",
  );
  assert.equal(
    validateCreateAffiliateInput({
      name: "Maya",
      email: "maya@example.com",
      whatsapp: "08123456789",
      code: "MAYA10",
      commission_type: "percentage",
      commission_value: 10,
    }),
    null,
  );
});

test("pickAffiliateUpdateFields keeps only allowed affiliate fields", () => {
  const safe = pickAffiliateUpdateFields({
    name: "Updated",
    is_active: false,
    commission_value: 15,
    code: "SHOULD_NOT_PASS",
  } as UpdateAffiliateInput & { code: string });

  assert.deepEqual(safe, {
    name: "Updated",
    is_active: false,
    commission_value: 15,
  });
  assert.equal(AFFILIATE_UPDATE_ALLOWED_FIELDS.includes("code" as never), false);
});

function createMockSupabase(handlers: {
  affiliates?: unknown[];
  conversions?: unknown[];
  onInsertAffiliate?: (row: Record<string, unknown>) => void;
  onUpdateAffiliate?: (id: string, row: Record<string, unknown>) => void;
  onDeleteAffiliate?: (id: string) => void;
  onUpdateConversion?: (id: string, row: Record<string, unknown>) => void;
  onRpc?: (fn: string, args: Record<string, unknown>) => unknown;
}) {
  const affiliates = [...(handlers.affiliates || [])];
  const conversions = [...(handlers.conversions || [])];

  return {
    from(table: string) {
      if (table === "affiliates") {
        return {
          select() {
            return this;
          },
          order() {
            return this;
          },
          async then(resolve: (value: { data: unknown[]; error: null }) => void) {
            resolve({ data: affiliates, error: null });
          },
          insert(row: Record<string, unknown>) {
            handlers.onInsertAffiliate?.(row);
            const saved = { id: "aff-new", ...row };
            affiliates.unshift(saved);
            return {
              select() {
                return this;
              },
              async single() {
                return { data: saved, error: null };
              },
            };
          },
          update(row: Record<string, unknown>) {
            return {
              eq(_column: string, id: string) {
                handlers.onUpdateAffiliate?.(id, row);
                return Promise.resolve({ error: null });
              },
            };
          },
          delete() {
            return {
              eq(_column: string, id: string) {
                handlers.onDeleteAffiliate?.(id);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      if (table === "affiliate_conversions") {
        return {
          select() {
            return this;
          },
          order() {
            return this;
          },
          async then(resolve: (value: { data: unknown[]; error: null }) => void) {
            resolve({ data: conversions, error: null });
          },
          update(row: Record<string, unknown>) {
            return {
              eq(_column: string, id: string) {
                handlers.onUpdateConversion?.(id, row);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc(fn: string, args: Record<string, unknown>) {
      handlers.onRpc?.(fn, args);
      return Promise.resolve({ data: { affiliate_id: "aff-rpc" }, error: null });
    },
  };
}

test("listAffiliates returns affiliates ordered by service query", async () => {
  const supabaseAdmin = createMockSupabase({
    affiliates: [{ id: "aff-1", code: "MAYA10", name: "Maya" }],
  });

  const rows = await listAffiliates(supabaseAdmin as any);
  assert.equal(rows.length, 1);
  assert.equal((rows[0] as { code: string }).code, "MAYA10");
});

test("createAffiliate inserts normalized affiliate row", async () => {
  let inserted: Record<string, unknown> | undefined;
  const supabaseAdmin = createMockSupabase({
    onInsertAffiliate: (row) => {
      inserted = row;
    },
  });

  const result = await createAffiliate(supabaseAdmin as any, {
    name: "Maya",
    email: "maya@example.com",
    whatsapp: "08123456789",
    code: " maya10 ",
    commission_type: "percentage",
    commission_value: 10,
  });

  assert.equal(result.ok, true);
  if (result.ok && result.kind === "affiliate") {
    assert.equal(result.affiliate.code, "MAYA10");
  }
  assert.equal(inserted?.code, "MAYA10");
});

test("createAffiliate uses rpc when autoCreateCoupon is enabled", async () => {
  let rpcFn: string | undefined;
  const supabaseAdmin = createMockSupabase({
    onRpc: (fn) => {
      rpcFn = fn;
    },
  });

  const result = await createAffiliate(supabaseAdmin as any, {
    name: "Maya",
    email: "maya@example.com",
    whatsapp: "08123456789",
    code: "MAYA10",
    commission_type: "percentage",
    commission_value: 10,
    autoCreateCoupon: true,
  });

  assert.equal(result.ok, true);
  assert.equal(rpcFn, "create_affiliate_with_coupon");
});

test("updateAffiliate and deleteAffiliate call expected mutations", async () => {
  let updatedId: string | undefined;
  let deletedId: string | undefined;
  const supabaseAdmin = createMockSupabase({
    onUpdateAffiliate: (id) => {
      updatedId = id;
    },
    onDeleteAffiliate: (id) => {
      deletedId = id;
    },
  });

  await updateAffiliate(supabaseAdmin as any, "aff-1", { is_active: false });
  await deleteAffiliate(supabaseAdmin as any, "aff-1");

  assert.equal(updatedId, "aff-1");
  assert.equal(deletedId, "aff-1");
});

test("listAffiliateConversions returns joined conversion rows", async () => {
  const supabaseAdmin = createMockSupabase({
    conversions: [{ id: "conv-1", payout_status: "pending" }],
  });

  const rows = await listAffiliateConversions(supabaseAdmin as any);
  assert.equal(rows.length, 1);
  assert.equal((rows[0] as { id: string }).id, "conv-1");
});

test("markAffiliateConversionPaid updates payout fields", async () => {
  let updated: { id?: string; row?: Record<string, unknown> } = {};
  const supabaseAdmin = createMockSupabase({
    onUpdateConversion: (id, row) => {
      updated = { id, row };
    },
  });

  await markAffiliateConversionPaid(supabaseAdmin as any, {
    conversionId: "conv-1",
    markedBy: "admin@example.com",
    payout: { payout_reference: "TRX-1", payout_note: "Paid out" },
  });

  assert.equal(updated.id, "conv-1");
  assert.equal(updated.row?.payout_status, "paid");
  assert.equal(updated.row?.payout_marked_by, "admin@example.com");
  assert.equal(updated.row?.payout_reference, "TRX-1");
  assert.equal(updated.row?.payout_note, "Paid out");
});
