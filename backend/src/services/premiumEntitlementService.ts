import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { grantPremiumInitialAiCredits } from "./aiCreditLedger";
import { resolveAuthUserForActivation } from "./authUserLookup";
import { logInfo } from "../logging/redaction";

export type AdminPremiumEntitlementResult = {
  activatedUserId: string | null;
  userActivated: boolean;
  creditsGranted: boolean;
  warnings: string[];
};

export type WebhookPremiumEntitlementResult = {
  userId: string | null;
  creditsGranted: boolean;
};

export async function activatePendingAuthUser(
  supabaseAdmin: SupabaseClient,
  pendingUserId: string,
) {
  const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.updateUserById(
    pendingUserId,
    {
      app_metadata: {
        siklusio_access_status: "active",
      },
    },
  );

  if (signupErr) throw signupErr;
  return authData.user;
}

export async function activateResolvedAuthUserPremiumAccess(
  supabaseAdmin: SupabaseClient,
  authUser: User,
): Promise<{ userActivated: boolean; alreadyActive: boolean }> {
  const currentAccessStatus = authUser.app_metadata?.siklusio_access_status;
  if (currentAccessStatus === "active") {
    return { userActivated: false, alreadyActive: true };
  }

  const { error: activeErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    app_metadata: {
      ...(authUser.app_metadata || {}),
      siklusio_access_status: "active",
    },
  });
  if (activeErr) throw activeErr;

  return { userActivated: true, alreadyActive: false };
}

export async function grantPremiumCreditsForActivation(
  supabaseAdmin: SupabaseClient,
  userId: string,
  referenceId?: string | null,
) {
  return grantPremiumInitialAiCredits({
    supabaseAdmin,
    userId,
    referenceId: referenceId || null,
  });
}

async function resolvePremiumCreditReferenceId(
  supabaseAdmin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data: premiumSession } = await supabaseAdmin
    .from("checkout_sessions")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return premiumSession?.id || null;
}

export async function grantWebhookPremiumEntitlement(params: {
  supabaseAdmin: SupabaseClient;
  pendingUserId: string;
  creditReferenceId?: string | null;
}): Promise<WebhookPremiumEntitlementResult> {
  const { supabaseAdmin, pendingUserId, creditReferenceId } = params;

  logInfo("--> Activating existing pending Supabase Auth user:", pendingUserId);
  const authUser = await activatePendingAuthUser(supabaseAdmin, pendingUserId);

  let creditsGranted = false;
  if (authUser?.id) {
    const creditsResult = await grantPremiumCreditsForActivation(
      supabaseAdmin,
      authUser.id,
      creditReferenceId || null,
    );
    creditsGranted = creditsResult !== null;
  }

  return {
    userId: authUser?.id || null,
    creditsGranted,
  };
}

export async function grantAdminManualPremiumEntitlement(params: {
  supabaseAdmin: SupabaseClient;
  authUserId?: string | null;
  email: string;
}): Promise<AdminPremiumEntitlementResult> {
  const { supabaseAdmin, authUserId, email } = params;
  const warnings: string[] = [];

  const authUser = await resolveAuthUserForActivation(supabaseAdmin, {
    authUserId,
    email,
  });

  if (!authUser) {
    warnings.push(
      "CRM status berhasil diubah, namun aktivasi user dilewati karena user terdaftar (auth) tidak ditemukan.",
    );
    return {
      activatedUserId: null,
      userActivated: false,
      creditsGranted: false,
      warnings,
    };
  }

  const activation = await activateResolvedAuthUserPremiumAccess(supabaseAdmin, authUser);
  if (activation.alreadyActive) {
    warnings.push("User auth sudah dalam keadaan aktif.");
  }

  const creditReferenceId = await resolvePremiumCreditReferenceId(supabaseAdmin, email);
  const creditsResult = await grantPremiumCreditsForActivation(
    supabaseAdmin,
    authUser.id,
    creditReferenceId,
  );

  let creditsGranted = false;
  if (creditsResult !== null) {
    creditsGranted = true;
  } else {
    warnings.push("Kredit premium awal (500) sudah pernah diberikan sebelumnya.");
  }

  return {
    activatedUserId: authUser.id,
    userActivated: activation.userActivated,
    creditsGranted,
    warnings,
  };
}