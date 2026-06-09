import { Context } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middlewares/auth";
import { getSupabaseAdmin } from "../services/supabaseAdmin";
import { logInfo, logError } from "../logging/redaction";
import {
  getAffiliateForUser,
  listAffiliateConversionsForUser,
  registerPublicAffiliate,
  updateAffiliateBankForUser,
  validatePublicAffiliateCode,
} from "../services/affiliatePublicService";
import { processCheckoutRegistration } from "../services/checkoutRegistrationService";
import { processCheckoutTopup } from "../services/checkoutTopupService";

// POST /api/checkout/topup
export const checkoutTopup = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Received request /api/checkout/topup");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const { packageId } = await c.req.json();
    const result = await processCheckoutTopup({
      c,
      supabaseAdmin: auth.supabaseAdmin,
      user: auth.user,
      packageId,
    });

    if (result.ok === false) {
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ paymentUrl: result.paymentUrl });
  } catch (error: any) {
    console.error("<-- Checkout topup error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server topup." }, 500);
  }
};

// POST /api/checkout/register
export const checkoutRegister = async (c: Context<{ Bindings: Env }>) => {
  logInfo("--> [BACKEND] Received request /api/checkout/register");
  try {
    const input = await c.req.json();
    const result = await processCheckoutRegistration({
      c,
      input,
      clientIp: c.req.header("CF-Connecting-IP") || "",
      clientUa: c.req.header("User-Agent") || "",
    });

    if (result.ok === false) {
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ paymentUrl: result.paymentUrl });
  } catch (error: any) {
    logError("<-- Checkout register error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server pendaftaran." }, 500);
  }
};

// GET /api/affiliate/validate
export const validateAffiliate = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/affiliate/validate");
  try {
    const supabaseAdmin = getSupabaseAdmin(c);
    const result = await validatePublicAffiliateCode(supabaseAdmin, c.req.query("code") || "");
    return c.json(result);
  } catch (error: any) {
    console.error("Affiliate validate error:", error);
    return c.json({ valid: false });
  }
};

// GET /api/affiliate/me
export const getAffiliateMe = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/affiliate/me");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const affiliate = await getAffiliateForUser(auth.supabaseAdmin, auth.user.email);
    return c.json({ affiliate });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// POST /api/affiliate/register
export const registerAffiliate = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] POST /api/affiliate/register");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const result = await registerPublicAffiliate(auth.supabaseAdmin, auth.user, body);

    if (result.ok === false) {
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ affiliate: result.affiliate });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// GET /api/affiliate/me/conversions
export const getAffiliateConversions = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] GET /api/affiliate/me/conversions");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const conversions = await listAffiliateConversionsForUser(auth.supabaseAdmin, auth.user.email);
    return c.json({ conversions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};

// PATCH /api/affiliate/me/bank
export const updateAffiliateBank = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] PATCH /api/affiliate/me/bank");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    await updateAffiliateBankForUser(auth.supabaseAdmin, auth.user.email, body);
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
};
