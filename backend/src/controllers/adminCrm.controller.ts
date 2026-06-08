import { getAdminAuth, type AdminHandlerContext } from "../middlewares/auth";
import { logInfo, logError } from "../logging/redaction";
import { processAdminManualPremiumActivation } from "../services/paymentActivationService";
import { scheduleAdminManualPaymentAutoresponder } from "../services/paymentNotificationService";

type AdminContext = AdminHandlerContext;

const leadStatuses = new Set([
  "new_lead",
  "contacted",
  "interested",
  "checkout_started",
  "pending_payment",
  "paid",
  "onboarded",
  "no_response",
  "not_interested",
]);

const paymentStatuses = new Set([
  "new",
  "checkout_started",
  "pending_payment",
  "paid",
  "paid_manual",
  "failed",
  "cancelled",
  "refunded",
]);

function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanEmail(value: unknown): string | null {
  const email = cleanString(value, 254);
  return email ? email.toLowerCase() : null;
}

function cleanWhatsapp(value: unknown): string | null {
  const text = cleanString(value, 32);
  if (!text) return null;
  return text.replace(/[^\d+]/g, "");
}

async function insertAuditLog(
  supabaseAdmin: any,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabaseAdmin.from("admin_crm_audit_logs").insert({
      actor_user_id: actorUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    });
  } catch (err) {
    logError("Failed to write audit log:", err);
  }
}

export const getAdminCrmSummary = async (c: AdminContext) => {
  try {
    const { supabaseAdmin } = getAdminAuth(c);

    const { data: leads, error } = await supabaseAdmin
      .from("admin_crm_leads")
      .select("id, lead_status, payment_status, amount, created_at, next_followup_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = new Date();

    const summary = {
      totalLeads: leads?.length || 0,
      pendingPayment:
        leads?.filter((lead: any) => lead.payment_status === "pending_payment").length || 0,
      paid:
        leads?.filter(
          (lead: any) => lead.payment_status === "paid" || lead.payment_status === "paid_manual",
        ).length || 0,
      needFollowUp:
        leads?.filter((lead: any) => {
          if (!lead.next_followup_at) return false;
          return new Date(lead.next_followup_at) <= now;
        }).length || 0,
      revenue:
        leads
          ?.filter(
            (lead: any) => lead.payment_status === "paid" || lead.payment_status === "paid_manual",
          )
          .reduce((sum: number, lead: any) => sum + Number(lead.amount || 0), 0) || 0,
    };

    return c.json({ summary });
  } catch (error: any) {
    logError("Error in getAdminCrmSummary:", error);
    return c.json({ error: error.message || "Gagal memuat ringkasan CRM" }, 500);
  }
};

export const getAdminCrmLeads = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const limitRaw = c.req.query("limit");
    const offsetRaw = c.req.query("offset");
    const limit = limitRaw ? Math.max(10, Math.min(200, Math.floor(Number(limitRaw)))) : 100;
    const offset = offsetRaw ? Math.max(0, Math.floor(Number(offsetRaw))) : 0;

    const status = c.req.query("status") || c.req.query("lead_status") || c.req.query("leadStatus");
    const payment = c.req.query("payment") || c.req.query("payment_status") || c.req.query("paymentStatus");
    const search = c.req.query("search") || c.req.query("q");

    let query = admin.supabaseAdmin
      .from("admin_crm_leads")
      .select(
        `
        *,
        notes:admin_crm_notes(id, note, created_at, admin_user_id),
        payment_overrides:admin_crm_payment_overrides(
          id,
          old_payment_status,
          new_payment_status,
          reason,
          reference,
          amount,
          created_at,
          admin_user_id
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && leadStatuses.has(status)) {
      query = query.eq("lead_status", status as any);
    }

    if (payment && paymentStatuses.has(payment)) {
      query = query.eq("payment_status", payment as any);
    }

    if (search && search.trim()) {
      const value = `%${search.trim()}%`;
      query = query.or(
        `name.ilike.${value},email.ilike.${value},whatsapp.ilike.${value},referral_code.ilike.${value},affiliate_code.ilike.${value}`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Fetch stats for the summary block
    const { data: statsRows, error: statsErr } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .select("payment_status, amount");
    if (statsErr) throw statsErr;

    const stats = (statsRows || []).reduce(
      (acc: any, row: any) => {
        acc.total += 1;
        acc[row.payment_status] = (acc[row.payment_status] || 0) + 1;
        if (row.payment_status === "paid" || row.payment_status === "paid_manual") {
          acc.revenue += Number(row.amount || 0);
        }
        return acc;
      },
      { total: 0, revenue: 0 },
    );

    return c.json({ leads: data || [], count: count || 0, limit, offset, stats });
  } catch (error: any) {
    logError("Error in getAdminCrmLeads:", error);
    return c.json({ error: error.message || "Gagal memuat lead CRM" }, 500);
  }
};

export const createAdminCrmLead = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const body = await c.req.json();

    const payload = {
      name: cleanString(body.name, 120),
      email: cleanEmail(body.email),
      whatsapp: cleanWhatsapp(body.whatsapp),
      source: cleanString(body.source, 80) || "manual_admin",
      referral_code: cleanString(body.referral_code, 80)?.toUpperCase() || null,
      affiliate_code: cleanString(body.affiliate_code, 80)?.toUpperCase() || null,
      lead_status: leadStatuses.has(body.lead_status) ? body.lead_status : "new_lead",
      payment_status: paymentStatuses.has(body.payment_status) ? body.payment_status : "new",
      amount: body.amount == null ? null : Number(body.amount),
      currency: cleanString(body.currency, 8) || "IDR",
      next_followup_at: cleanString(body.next_followup_at, 64),
    };

    if (!payload.email && !payload.whatsapp) {
      return c.json({ error: "Minimal isi email atau WhatsApp lead." }, 400);
    }

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await insertAuditLog(
      admin.supabaseAdmin,
      admin.user.id,
      "crm_lead_created",
      "admin_crm_leads",
      data.id,
      { email: payload.email, source: payload.source },
    );

    return c.json({ lead: data });
  } catch (error: any) {
    logError("Error in createAdminCrmLead:", error);
    return c.json({ error: error.message || "Gagal membuat lead CRM" }, 500);
  }
};

export const updateAdminCrmLead = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const id = c.req.param("id");
    const body = await c.req.json();

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = cleanString(body.name, 120);
    if (body.email !== undefined) updates.email = cleanEmail(body.email);
    if (body.whatsapp !== undefined) updates.whatsapp = cleanWhatsapp(body.whatsapp);
    if (body.source !== undefined) updates.source = cleanString(body.source, 80);
    if (body.referral_code !== undefined) {
      updates.referral_code = cleanString(body.referral_code, 80)?.toUpperCase() || null;
    }
    if (body.affiliate_code !== undefined) {
      updates.affiliate_code = cleanString(body.affiliate_code, 80)?.toUpperCase() || null;
    }
    if (body.lead_status !== undefined && leadStatuses.has(body.lead_status)) {
      updates.lead_status = body.lead_status;
    }
    if (body.payment_status !== undefined && paymentStatuses.has(body.payment_status)) {
      updates.payment_status = body.payment_status;
    }
    if (body.next_followup_at !== undefined) {
      updates.next_followup_at = cleanString(body.next_followup_at, 64);
    }
    if (body.last_contacted_at !== undefined) {
      updates.last_contacted_at = cleanString(body.last_contacted_at, 64);
    }

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await insertAuditLog(
      admin.supabaseAdmin,
      admin.user.id,
      "crm_lead_updated",
      "admin_crm_leads",
      id,
      { fields: Object.keys(updates) },
    );

    return c.json({ lead: data });
  } catch (error: any) {
    logError("Error in updateAdminCrmLead:", error);
    return c.json({ error: error.message || "Gagal update lead CRM" }, 500);
  }
};

export const createAdminCrmNote = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const leadId = c.req.param("id");
    const body = await c.req.json();
    const note = cleanString(body.note, 2000);

    if (!note) return c.json({ error: "Catatan tidak boleh kosong." }, 400);

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_notes")
      .insert({
        lead_id: leadId,
        admin_user_id: admin.user.id,
        note,
      })
      .select()
      .single();

    if (error) throw error;

    await insertAuditLog(
      admin.supabaseAdmin,
      admin.user.id,
      "crm_note_created",
      "admin_crm_leads",
      leadId,
      { note_id: data.id },
    );

    return c.json({ note: data });
  } catch (error: any) {
    logError("Error in createAdminCrmNote:", error);
    return c.json({ error: error.message || "Gagal membuat catatan CRM" }, 500);
  }
};

export const overrideAdminCrmPaymentStatus = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);
    const { supabaseAdmin } = admin;
    const leadId = c.req.param("id");
    const body = await c.req.json();

    const newStatus = cleanString(body.payment_status || body.new_payment_status, 40);
    const reason = cleanString(body.reason, 1000);
    const reference = cleanString(body.reference, 200);
    const amount = body.amount == null ? null : Number(body.amount);
    const shouldActivateUser = Boolean(body.should_activate_user);

    if (!newStatus || !paymentStatuses.has(newStatus)) {
      return c.json({ error: "Status pembayaran tidak valid." }, 400);
    }

    if (!reason || reason.length < 8) {
      return c.json({ error: "Alasan wajib diisi minimal 8 karakter." }, 400);
    }

    // Get lead data
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from("admin_crm_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadErr) throw leadErr;
    if (!lead) return c.json({ error: "Lead tidak ditemukan." }, 404);

    const email = cleanEmail(lead.email);

    // If trying to activate with paid/paid_manual status, enforce email and reference safety
    if (shouldActivateUser && (newStatus === "paid" || newStatus === "paid_manual")) {
      if (!email) {
        return c.json({ error: "Lead harus memiliki alamat email untuk diaktifkan." }, 400);
      }
      // Simple format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return c.json({ error: "Alamat email lead tidak valid." }, 400);
      }
    }

    // Generate idempotency key
    // manual_payment:{lead_id}:{payment_status}:{reference}
    // If reference is empty, we only allow it if pending registration exists.
    // If reference is empty and we don't have pending registration, we block it.
    let finalReference = reference;
    const { data: pending } = email
      ? await supabaseAdmin
          .from("pending_registrations")
          .select("*")
          .eq("email", email)
          .maybeSingle()
      : { data: null };

    if (shouldActivateUser && (newStatus === "paid" || newStatus === "paid_manual")) {
      if (!pending && !finalReference) {
        return c.json(
          {
            error:
              "Bukti pembayaran (reference) wajib diisi untuk aktivasi tanpa pending registration.",
          },
          400,
        );
      }
    }

    const idempotencyKey = `manual_payment:${leadId}:${newStatus}:${finalReference || "no-ref-" + Math.random().toString(36).substring(2, 10)}`;

    // Check for existing override with the same idempotency key
    const { data: existingOverride } = await supabaseAdmin
      .from("admin_crm_payment_overrides")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingOverride) {
      logInfo(`Idempotent payment override matched for key: ${idempotencyKey}`);
      return c.json({
        lead,
        override: existingOverride,
        activationResult: {
          paymentOverrideCreated: false,
          userActivated: false,
          creditsGranted: false,
          affiliateConversionCreated: false,
          checkoutSessionUpdated: false,
          pendingRegistrationCleaned: false,
          warnings: ["Permintaan ini sudah diproses sebelumnya (idempotency key cocok)."],
        },
      });
    }

    // Prepare response result checklist
    const activationResult = {
      paymentOverrideCreated: false,
      userActivated: false,
      creditsGranted: false,
      affiliateConversionCreated: false,
      checkoutSessionUpdated: false,
      pendingRegistrationCleaned: false,
      warnings: [] as string[],
    };

    // Insert override record
    const oldStatus = lead.payment_status || null;
    const { data: override, error: overrideErr } = await supabaseAdmin
      .from("admin_crm_payment_overrides")
      .insert({
        lead_id: leadId,
        admin_user_id: admin.user.id,
        old_payment_status: oldStatus,
        new_payment_status: newStatus as any,
        reason,
        reference: finalReference,
        amount,
        should_activate_user: shouldActivateUser,
        activated_user_id: null, // we will fill this if activated
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (overrideErr) throw overrideErr;
    activationResult.paymentOverrideCreated = true;

    // Update lead payment status
    const leadUpdates: Record<string, unknown> = {
      payment_status: newStatus,
      manual_payment_reference: finalReference,
    };

    if (newStatus === "paid" || newStatus === "paid_manual") {
      leadUpdates.lead_status = "paid";
      if (amount != null && Number.isFinite(amount)) {
        leadUpdates.amount = amount;
      }
    }

    const { data: updatedLead, error: updateErr } = await supabaseAdmin
      .from("admin_crm_leads")
      .update(leadUpdates as any)
      .eq("id", leadId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    let finalActivatedUserId: string | null = null;

    if (shouldActivateUser && (newStatus === "paid" || newStatus === "paid_manual")) {
      try {
        const manualActivation = await processAdminManualPremiumActivation({
          supabaseAdmin,
          pending,
          lead,
          email,
          amount,
          activationResult,
        });

        finalActivatedUserId = manualActivation.activatedUserId;

        if (finalActivatedUserId) {
          await supabaseAdmin
            .from("admin_crm_payment_overrides")
            .update({ activated_user_id: finalActivatedUserId })
            .eq("id", override.id);
        }
      } catch (actError: any) {
        logError("Error during user activation in manual override:", actError);
        activationResult.warnings.push(
          `Terjadi kesalahan saat mengaktifkan user: ${actError.message || actError}`,
        );
      }
    }

    // Update lead table with user_id reference if user was found and not already linked
    if (finalActivatedUserId && !lead.user_id) {
      await supabaseAdmin
        .from("admin_crm_leads")
        .update({ user_id: finalActivatedUserId })
        .eq("id", leadId);
      updatedLead.user_id = finalActivatedUserId;
    }

    if (newStatus === "paid" || newStatus === "paid_manual") {
      scheduleAdminManualPaymentAutoresponder({
        c,
        lead,
        overrideId: override.id,
        finalReference,
        amount,
      });
    }

    // Write audit log
    await insertAuditLog(
      supabaseAdmin,
      admin.user.id,
      "crm_payment_status_overridden",
      "admin_crm_leads",
      leadId,
      {
        old_status: oldStatus,
        new_status: newStatus,
        override_id: override.id,
        should_activate_user: shouldActivateUser,
        activation_checklist: activationResult,
      },
    );

    return c.json({
      lead: updatedLead,
      override,
      activationResult,
    });
  } catch (error: any) {
    logError("Error in overrideAdminCrmPaymentStatus:", error);
    return c.json({ error: error.message || "Gagal mengganti status pembayaran manual" }, 500);
  }
};

export const markAdminCrmLeadContacted = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const id = c.req.param("id");
    const now = new Date().toISOString();

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .update({ lead_status: "contacted", last_contacted_at: now })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await insertAuditLog(
      admin.supabaseAdmin,
      admin.user.id,
      "crm_lead_contacted",
      "admin_crm_leads",
      id,
      { at: now },
    );

    return c.json({ lead: data });
  } catch (error: any) {
    logError("Error in markAdminCrmLeadContacted:", error);
    return c.json({ error: error.message || "Gagal menandai dihubungi" }, 500);
  }
};
