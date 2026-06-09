import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types/database.types";
import { logError } from "../logging/redaction";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function lookupAuthUserIdByEmail(
  supabaseAdmin: SupabaseClient<Database>,
  email: string,
): Promise<string | null> {
  const normalizedEmail = normalizeAuthEmail(email);

  const { data: pending, error: pendingErr } = await supabaseAdmin
    .from("pending_registrations")
    .select("user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (pendingErr) {
    logError("Failed to lookup pending registration by email:", pendingErr);
  } else if (pending?.user_id && UUID_REGEX.test(pending.user_id)) {
    return pending.user_id;
  }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("admin_crm_leads")
    .select("user_id")
    .eq("email", normalizedEmail)
    .not("user_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (leadErr) {
    logError("Failed to lookup CRM lead user_id by email:", leadErr);
  } else if (lead?.user_id && UUID_REGEX.test(lead.user_id)) {
    return lead.user_id;
  }

  return null;
}

export async function resolveAuthUserForActivation(
  supabaseAdmin: SupabaseClient<Database>,
  params: {
    authUserId?: string | null;
    email?: string | null;
  },
): Promise<User | null> {
  let authUser: User | null = null;

  if (params.authUserId && UUID_REGEX.test(params.authUserId)) {
    const { data: authData, error } = await supabaseAdmin.auth.admin.getUserById(params.authUserId);
    if (error) {
      logError("Failed to get auth user by id:", error);
    }
    authUser = authData?.user ?? null;
  }

  if (!authUser && params.email) {
    const resolvedUserId = await lookupAuthUserIdByEmail(supabaseAdmin, params.email);
    if (resolvedUserId) {
      const { data: authData, error } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId);
      if (error) {
        logError("Failed to get auth user by resolved id:", error);
      }
      authUser = authData?.user ?? null;
    }
  }

  return authUser;
}
