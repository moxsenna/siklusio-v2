import { createClient } from "@supabase/supabase-js";
import { type Context } from "hono";
import { type Env } from "../env";

export const getSupabaseAdmin = (c: Context<{ Bindings: Env }>) => {
  const supabaseUrl = c.env.VITE_SUPABASE_URL;
  const serviceRoleKey = c.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const listAllAuthUsers = async (supabaseAdmin: any) => {
  const perPage = 1000;
  const users: any[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    users.push(...data.users);

    const total = "total" in data ? data.total : 0;
    if (data.users.length < perPage || (typeof total === "number" && users.length >= total)) {
      break;
    }
  }

  return users;
};
