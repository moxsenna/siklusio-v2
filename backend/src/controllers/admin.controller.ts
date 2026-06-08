import { getAdminAuth, type AdminHandlerContext } from "../middlewares/auth";
import {
  createAffiliate,
  deleteAffiliate,
  listAffiliateConversions,
  listAffiliates,
  markAffiliateConversionPaid,
  updateAffiliate,
} from "../services/affiliateAdminService";
import { listAllAuthUsers } from "../services/supabaseAdmin";

// GET /api/admin/users
export const getAdminUsers = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] Received request /api/admin/users");
  try {
    const { supabaseAdmin } = getAdminAuth(c);

    const authUsers = await listAllAuthUsers(supabaseAdmin);
    const authUsersById = new Map(authUsers.map((authUser: any) => [authUser.id, authUser]));

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    const usersData = profiles.map((p) => {
      const authUser = authUsersById.get(p.id);
      return {
        ...p,
        email: authUser?.email,
        last_sign_in_at: authUser?.last_sign_in_at,
      };
    });

    return c.json({ users: usersData });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: error.message || "Failed to fetch users" }, 500);
  }
};

// GET /api/admin/coupons
export const getAdminCoupons = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] Received request GET /api/admin/coupons");
  try {
    const { supabaseAdmin } = getAdminAuth(c);

    const { data: coupons, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return c.json({ coupons });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// POST /api/admin/coupons
export const createAdminCoupon = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] Received request POST /api/admin/coupons");
  try {
    const { supabaseAdmin } = getAdminAuth(c);

    const { code, discount_type, discount_value, is_active } = await c.req.json();
    if (!code || !discount_type || !discount_value) {
      return c.json({ error: "Input tidak valid" }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .insert({
        code: code.trim(),
        discount_type,
        discount_value: Number(discount_value),
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return c.json({ coupon: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// PATCH /api/admin/coupons/:id
export const updateAdminCoupon = async (c: AdminHandlerContext) => {
  try {
    const { supabaseAdmin } = getAdminAuth(c);

    const id = c.req.param("id");
    const { is_active } = await c.req.json();

    const { error } = await supabaseAdmin.from("coupons").update({ is_active }).eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// DELETE /api/admin/coupons/:id
export const deleteAdminCoupon = async (c: AdminHandlerContext) => {
  try {
    const { supabaseAdmin } = getAdminAuth(c);

    const id = c.req.param("id");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// GET /api/admin/affiliates
export const getAdminAffiliates = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] GET /api/admin/affiliates");
  try {
    const { supabaseAdmin } = getAdminAuth(c);
    const affiliates = await listAffiliates(supabaseAdmin);
    return c.json({ affiliates });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// POST /api/admin/affiliates
export const createAdminAffiliate = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] POST /api/admin/affiliates");
  try {
    const { supabaseAdmin } = getAdminAuth(c);
    const body = await c.req.json();
    const result = await createAffiliate(supabaseAdmin, body);

    if (result.ok === false) {
      return c.json({ error: result.error }, result.status);
    }

    if (result.kind === "rpc") {
      return c.json({ result: result.result });
    }

    return c.json({ affiliate: result.affiliate });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// PATCH /api/admin/affiliates/:id
export const updateAdminAffiliate = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] PATCH /api/admin/affiliates/:id");
  try {
    const { supabaseAdmin } = getAdminAuth(c);
    const id = c.req.param("id");
    const updates = await c.req.json();
    await updateAffiliate(supabaseAdmin, id, updates);
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// DELETE /api/admin/affiliates/:id
export const deleteAdminAffiliate = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] DELETE /api/admin/affiliates/:id");
  try {
    const { supabaseAdmin } = getAdminAuth(c);
    const id = c.req.param("id");
    await deleteAffiliate(supabaseAdmin, id);
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// GET /api/admin/affiliates/conversions
export const getAdminAffiliateConversions = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] GET /api/admin/affiliates/conversions");
  try {
    const { supabaseAdmin } = getAdminAuth(c);
    const conversions = await listAffiliateConversions(supabaseAdmin);
    return c.json({ conversions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// PATCH /api/admin/affiliates/conversions/:id/payout
export const payoutAdminAffiliateConversion = async (c: AdminHandlerContext) => {
  console.log("--> [BACKEND] PATCH /api/admin/affiliates/conversions/:id/payout");
  try {
    const { supabaseAdmin, user } = getAdminAuth(c);
    const id = c.req.param("id");
    const { payout_reference, payout_note } = await c.req.json();

    await markAffiliateConversionPaid(supabaseAdmin, {
      conversionId: id,
      markedBy: user.email || user.id,
      payout: { payout_reference, payout_note },
    });

    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};