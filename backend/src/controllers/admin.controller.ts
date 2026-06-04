import { Context } from "hono";
import { type Env } from "../env";
import { requireUser, requireAdmin } from "../middlewares/auth";
import { listAllAuthUsers } from "../services/supabaseAdmin";

// GET /api/admin/users
export const getAdminUsers = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Received request /api/admin/users");
  try {
    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }
    const { supabaseAdmin, user } = auth;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return c.json({ error: profileErr.message }, 500);
    }

    if (!profile?.is_admin) {
      return c.json({ error: "Forbidden: admin access required" }, 403);
    }

    const authUsers = await listAllAuthUsers(supabaseAdmin);
    const authUsersById = new Map(authUsers.map((authUser: any) => [authUser.id, authUser]));

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    // Merge database profiles and Auth emails
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
export const getAdminCoupons = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Received request GET /api/admin/coupons");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden: admin access required" }, 403);

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
export const createAdminCoupon = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Received request POST /api/admin/coupons");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing session" }, 401);
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden" }, 403);

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
export const updateAdminCoupon = async (c: Context<{ Bindings: Env }>) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing session" }, 401);
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden" }, 403);

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
export const deleteAdminCoupon = async (c: Context<{ Bindings: Env }>) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing session" }, 401);
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// GET /api/admin/affiliates
export const getAdminAffiliates = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/admin/affiliates");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const { data, error } = await admin.supabaseAdmin
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ affiliates: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// POST /api/admin/affiliates
export const createAdminAffiliate = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] POST /api/admin/affiliates");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const body = await c.req.json();
    const {
      name,
      email,
      whatsapp,
      code,
      commission_type,
      commission_value,
      bank_name,
      account_number,
      account_holder,
      autoCreateCoupon,
      coupon_discount_type,
      coupon_discount_value,
    } = body;

    if (!name || !email || !whatsapp || !code || !commission_type || commission_value == null) {
      return c.json({ error: "Data afiliasi tidak lengkap" }, 400);
    }

    if (autoCreateCoupon) {
      // Use transactional RPC
      const { data, error } = await admin.supabaseAdmin.rpc("create_affiliate_with_coupon", {
        p_name: name,
        p_email: email,
        p_whatsapp: whatsapp,
        p_code: code,
        p_commission_type: commission_type,
        p_commission_value: Number(commission_value),
        p_bank_name: bank_name || null,
        p_account_number: account_number || null,
        p_account_holder: account_holder || null,
        p_auto_coupon: true,
        p_coupon_discount_type: coupon_discount_type || "percentage",
        p_coupon_discount_value: Number(coupon_discount_value || 10),
      });
      if (error) throw error;
      return c.json({ result: data });
    } else {
      // Direct insert without coupon
      const { data, error } = await admin.supabaseAdmin
        .from("affiliates")
        .insert({
          name,
          email,
          whatsapp,
          code: code.trim().toUpperCase(),
          commission_type,
          commission_value: Number(commission_value),
          bank_name: bank_name || null,
          account_number: account_number || null,
          account_holder: account_holder || null,
        })
        .select()
        .single();
      if (error) throw error;
      return c.json({ affiliate: data });
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// PATCH /api/admin/affiliates/:id
export const updateAdminAffiliate = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] PATCH /api/admin/affiliates/:id");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const updates = await c.req.json();

    // Only allow safe fields to be updated
    const allowedFields = [
      "name",
      "email",
      "whatsapp",
      "commission_type",
      "commission_value",
      "bank_name",
      "account_number",
      "account_holder",
      "is_active",
      "allow_zero_order_commission",
    ];
    const safeUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const { error } = await admin.supabaseAdmin
      .from("affiliates")
      .update(safeUpdates as any)
      .eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// DELETE /api/admin/affiliates/:id
export const deleteAdminAffiliate = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] DELETE /api/admin/affiliates/:id");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { error } = await admin.supabaseAdmin.from("affiliates").delete().eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// GET /api/admin/affiliates/conversions
export const getAdminAffiliateConversions = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/admin/affiliates/conversions");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const { data, error } = await admin.supabaseAdmin
      .from("affiliate_conversions")
      .select(
        "*, affiliates(name, code, email, whatsapp, bank_name, account_number, account_holder)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ conversions: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// PATCH /api/admin/affiliates/conversions/:id/payout
export const payoutAdminAffiliateConversion = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] PATCH /api/admin/affiliates/conversions/:id/payout");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { payout_reference, payout_note } = await c.req.json();

    const { error } = await admin.supabaseAdmin
      .from("affiliate_conversions")
      .update({
        payout_status: "paid",
        payout_at: new Date().toISOString(),
        payout_marked_by: admin.user.email || admin.user.id,
        payout_reference: payout_reference || null,
        payout_note: payout_note || null,
      })
      .eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
