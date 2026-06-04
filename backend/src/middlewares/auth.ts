import { type Context } from "hono";
import { type Env } from "../env";
import { getSupabaseAdmin } from "../services/supabaseAdmin";

export const requireUser = async (c: Context<{ Bindings: Env }>) => {
  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return null;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin(c);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return null;
    }

    return { supabaseAdmin, user: userData.user };
  } catch (error) {
    console.error("requireUser authentication error:", error);
    return null;
  }
};

export const requireAdmin = async (c: Context<{ Bindings: Env }>) => {
  const auth = await requireUser(c);
  if (!auth) return null;
  const { supabaseAdmin, user } = auth;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return null;
  return { supabaseAdmin, user };
};
