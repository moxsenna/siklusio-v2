# Prompt untuk AI Coding Agent — Fix Admin CRM Siklusio v2

Konteks repo: `https://github.com/moxsenna/siklusio-v2`

Masalah produksi:
1. User baru yang daftar lewat checkout tidak masuk ke Admin CRM.
2. Tombol status CRM seperti `Gagal`, `Lunas Manual`, `Set Pending` tidak bereaksi.
3. Admin CRM saat ini belum nyaman untuk volume ratusan lead per hari.

Diagnosis dari repo main:
- Migration `supabase/migrations/20260605134100_admin_crm.sql` hanya membuat tabel `admin_crm_leads`, notes, override, audit log. Belum ada integrasi otomatis dari checkout/webhook.
- `backend/src/routes/admin.route.ts` belum expose endpoint CRM; yang ada baru users, coupons, affiliates.
- `backend/src/controllers/admin.controller.ts` belum punya handler CRM.
- `backend/src/controllers/checkout.controller.ts` hanya menulis `pending_registrations` dan `checkout_sessions`, belum upsert ke `admin_crm_leads`.
- `backend/src/controllers/webhook.mayar.controller.ts` mengaktifkan user dan update sesi pembayaran, tapi belum update `admin_crm_leads` menjadi paid.

Target implementasi:
- Setiap checkout register wajib membuat/mengupdate `admin_crm_leads`.
- Webhook sukses wajib update CRM menjadi `paid`.
- Admin bisa ganti status lewat dropdown single action.
- UI CRM punya 3 view: `List`, `Kanban`, `Detail`.
- Backend tetap wajib `requireAdmin`; jangan expose service role ke frontend.
- Semua aksi admin penting wajib masuk `admin_crm_audit_logs`.

---

## 1) Buat migration baru

Buat file baru:
`supabase/migrations/20260606120000_admin_crm_fix_pipeline.sql`

Isi:

```sql
-- Admin CRM hardening: lookup indexes, backfill-safe unique constraints, and RPC helpers.
-- Additive only. Safe to run after 20260605134100_admin_crm.sql.

create unique index if not exists idx_admin_crm_leads_unique_email
  on public.admin_crm_leads (lower(email))
  where email is not null;

create unique index if not exists idx_admin_crm_leads_unique_user_id
  on public.admin_crm_leads (user_id)
  where user_id is not null;

create unique index if not exists idx_admin_crm_leads_unique_mayar_transaction
  on public.admin_crm_leads (mayar_transaction_id)
  where mayar_transaction_id is not null;

create index if not exists idx_admin_crm_leads_created_at
  on public.admin_crm_leads (created_at desc);

create index if not exists idx_admin_crm_leads_status_created_at
  on public.admin_crm_leads (payment_status, lead_status, created_at desc);

create or replace function public.admin_crm_upsert_lead(
  p_user_id uuid default null,
  p_pending_registration_id uuid default null,
  p_name text default null,
  p_email text default null,
  p_whatsapp text default null,
  p_source text default 'checkout',
  p_referral_code text default null,
  p_affiliate_code text default null,
  p_lead_status public.admin_crm_lead_status default 'checkout_started',
  p_payment_status public.admin_crm_payment_status default 'pending_payment',
  p_checkout_url text default null,
  p_mayar_payment_id text default null,
  p_mayar_transaction_id text default null,
  p_amount integer default null,
  p_currency text default 'IDR'
)
returns public.admin_crm_leads
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := nullif(lower(trim(p_email)), '');
  v_row public.admin_crm_leads;
begin
  if v_email is null and p_user_id is null and p_mayar_transaction_id is null then
    raise exception 'email, user_id, or mayar_transaction_id is required';
  end if;

  select * into v_row
  from public.admin_crm_leads l
  where (p_user_id is not null and l.user_id = p_user_id)
     or (v_email is not null and lower(l.email) = v_email)
     or (p_mayar_transaction_id is not null and l.mayar_transaction_id = p_mayar_transaction_id)
  order by l.created_at desc
  limit 1;

  if found then
    update public.admin_crm_leads
    set
      user_id = coalesce(p_user_id, user_id),
      pending_registration_id = coalesce(p_pending_registration_id, pending_registration_id),
      name = coalesce(nullif(trim(p_name), ''), name),
      email = coalesce(v_email, email),
      whatsapp = coalesce(nullif(trim(p_whatsapp), ''), whatsapp),
      source = coalesce(nullif(trim(p_source), ''), source),
      referral_code = coalesce(nullif(trim(p_referral_code), ''), referral_code),
      affiliate_code = coalesce(nullif(trim(p_affiliate_code), ''), affiliate_code),
      lead_status = coalesce(p_lead_status, lead_status),
      payment_status = coalesce(p_payment_status, payment_status),
      checkout_url = coalesce(nullif(trim(p_checkout_url), ''), checkout_url),
      mayar_payment_id = coalesce(nullif(trim(p_mayar_payment_id), ''), mayar_payment_id),
      mayar_transaction_id = coalesce(nullif(trim(p_mayar_transaction_id), ''), mayar_transaction_id),
      amount = coalesce(p_amount, amount),
      currency = coalesce(nullif(trim(p_currency), ''), currency),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;

    return v_row;
  end if;

  insert into public.admin_crm_leads (
    user_id,
    pending_registration_id,
    name,
    email,
    whatsapp,
    source,
    referral_code,
    affiliate_code,
    lead_status,
    payment_status,
    checkout_url,
    mayar_payment_id,
    mayar_transaction_id,
    amount,
    currency
  ) values (
    p_user_id,
    p_pending_registration_id,
    nullif(trim(p_name), ''),
    v_email,
    nullif(trim(p_whatsapp), ''),
    coalesce(nullif(trim(p_source), ''), 'checkout'),
    nullif(trim(p_referral_code), ''),
    nullif(trim(p_affiliate_code), ''),
    p_lead_status,
    p_payment_status,
    nullif(trim(p_checkout_url), ''),
    nullif(trim(p_mayar_payment_id), ''),
    nullif(trim(p_mayar_transaction_id), ''),
    p_amount,
    coalesce(nullif(trim(p_currency), ''), 'IDR')
  ) returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_crm_upsert_lead(
  uuid, uuid, text, text, text, text, text, text,
  public.admin_crm_lead_status, public.admin_crm_payment_status,
  text, text, text, integer, text
) from public;

grant execute on function public.admin_crm_upsert_lead(
  uuid, uuid, text, text, text, text, text, text,
  public.admin_crm_lead_status, public.admin_crm_payment_status,
  text, text, text, integer, text
) to service_role;
```

---

## 2) Tambahkan service backend CRM

Buat file baru:
`backend/src/services/adminCrm.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminCrmLeadStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "onboarded"
  | "no_response"
  | "not_interested";

export type AdminCrmPaymentStatus =
  | "new"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "paid_manual"
  | "failed"
  | "cancelled"
  | "refunded";

export type UpsertAdminCrmLeadInput = {
  userId?: string | null;
  pendingRegistrationId?: string | null;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  source?: string | null;
  referralCode?: string | null;
  affiliateCode?: string | null;
  leadStatus?: AdminCrmLeadStatus;
  paymentStatus?: AdminCrmPaymentStatus;
  checkoutUrl?: string | null;
  mayarPaymentId?: string | null;
  mayarTransactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
};

export async function upsertAdminCrmLead(
  supabaseAdmin: SupabaseClient,
  input: UpsertAdminCrmLeadInput,
) {
  const { data, error } = await supabaseAdmin.rpc("admin_crm_upsert_lead", {
    p_user_id: input.userId || null,
    p_pending_registration_id: input.pendingRegistrationId || null,
    p_name: input.name || null,
    p_email: input.email || null,
    p_whatsapp: input.whatsapp || null,
    p_source: input.source || "checkout",
    p_referral_code: input.referralCode || null,
    p_affiliate_code: input.affiliateCode || null,
    p_lead_status: input.leadStatus || "checkout_started",
    p_payment_status: input.paymentStatus || "pending_payment",
    p_checkout_url: input.checkoutUrl || null,
    p_mayar_payment_id: input.mayarPaymentId || null,
    p_mayar_transaction_id: input.mayarTransactionId || null,
    p_amount: input.amount ?? null,
    p_currency: input.currency || "IDR",
  });

  if (error) throw error;
  return data;
}

export async function insertAdminCrmAuditLog(
  supabaseAdmin: SupabaseClient,
  input: {
    actorUserId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabaseAdmin.from("admin_crm_audit_logs").insert({
    actor_user_id: input.actorUserId || null,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId || null,
    metadata: input.metadata || {},
  });

  if (error) throw error;
}
```

---

## 3) Integrasikan checkout register ke CRM

Edit file:
`backend/src/controllers/checkout.controller.ts`

Tambahkan import:

```ts
import { upsertAdminCrmLead } from "../services/adminCrm";
```

### 3A. Di branch free bypass

Setelah insert `checkout_sessions` yang menghasilkan `session`, tambahkan:

```ts
await upsertAdminCrmLead(supabaseAdmin, {
  userId: authData.user?.id || null,
  name,
  email: email.toLowerCase(),
  whatsapp,
  source: "free_bypass_checkout",
  referralCode: couponCode ? couponCode.trim().toUpperCase() : null,
  affiliateCode: validatedAffiliateCode,
  leadStatus: "paid",
  paymentStatus: "paid_manual",
  checkoutUrl: "https://app.siklusio.web.id/auth?status=success_free",
  mayarTransactionId: null,
  amount: 0,
});
```

### 3B. Di branch paid checkout

Setelah `pending_registrations.upsert`, ubah agar `.select().maybeSingle()` supaya bisa ambil id:

```ts
const { data: pendingRow, error: insertErr } = await supabaseAdmin
  .from("pending_registrations")
  .upsert(
    {
      email: email.toLowerCase(),
      user_id: userId,
      name,
      whatsapp,
      coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
      affiliate_code: validatedAffiliateCode,
    },
    { onConflict: "email" },
  )
  .select("id")
  .maybeSingle();
```

Setelah berhasil insert `checkout_sessions`, tambahkan:

```ts
await upsertAdminCrmLead(supabaseAdmin, {
  userId,
  pendingRegistrationId: pendingRow?.id || null,
  name,
  email: email.toLowerCase(),
  whatsapp,
  source: "checkout_register",
  referralCode: couponCode ? couponCode.trim().toUpperCase() : null,
  affiliateCode: validatedAffiliateCode,
  leadStatus: "checkout_started",
  paymentStatus: "pending_payment",
  checkoutUrl: paymentUrl,
  mayarTransactionId: mayarTxId,
  amount: finalAmount,
});
```

Catatan: kalau TypeScript mengeluh karena `upsert` lama tidak return data, gunakan pattern ini secara hati-hati dan pastikan error cleanup tetap jalan.

---

## 4) Integrasikan Mayar webhook ke CRM

Edit file:
`backend/src/controllers/webhook.mayar.controller.ts`

Tambahkan import:

```ts
import { upsertAdminCrmLead } from "../services/adminCrm";
```

Setelah `grantPremiumInitialAiCredits`, sebelum proses affiliate conversion, tambahkan:

```ts
await upsertAdminCrmLead(supabaseAdmin, {
  userId: authData.user?.id || pending.user_id || null,
  pendingRegistrationId: pending.id,
  name: pending.name,
  email: pending.email,
  whatsapp: pending.whatsapp,
  source: "mayar_webhook",
  referralCode: pending.coupon_code || null,
  affiliateCode: pending.affiliate_code || null,
  leadStatus: "paid",
  paymentStatus: "paid",
  mayarTransactionId,
  amount: body.data?.amount ? Number(body.data.amount) : null,
});
```

Jika ada update `checkout_sessions` status paid yang saat ini hanya berjalan ketika affiliateCode ada, pindahkan update sesi agar selalu berjalan untuk email terkait. Tambahkan fallback:

```ts
await supabaseAdmin
  .from("checkout_sessions")
  .update({ status: "paid", paid_at: new Date().toISOString() })
  .eq("email", email.toLowerCase())
  .eq("status", "pending");
```

---

## 5) Tambahkan controller CRM backend

Buat file baru:
`backend/src/controllers/adminCrm.controller.ts`

```ts
import { type Context } from "hono";
import { type Env } from "../env";
import { requireAdmin } from "../middlewares/auth";
import {
  insertAdminCrmAuditLog,
  type AdminCrmLeadStatus,
  type AdminCrmPaymentStatus,
} from "../services/adminCrm";

const leadStatuses = new Set<AdminCrmLeadStatus>([
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

const paymentStatuses = new Set<AdminCrmPaymentStatus>([
  "new",
  "checkout_started",
  "pending_payment",
  "paid",
  "paid_manual",
  "failed",
  "cancelled",
  "refunded",
]);

function clampLimit(raw: string | undefined) {
  const n = Number(raw || 50);
  if (!Number.isFinite(n)) return 50;
  return Math.max(10, Math.min(200, Math.floor(n)));
}

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const getAdminCrmLeads = async (c: Context<{ Bindings: Env }>) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const q = safeText(c.req.query("q"));
    const paymentStatus = safeText(c.req.query("payment_status"));
    const leadStatus = safeText(c.req.query("lead_status"));
    const limit = clampLimit(c.req.query("limit"));
    const offset = Math.max(0, Number(c.req.query("offset") || 0));

    let query = admin.supabaseAdmin
      .from("admin_crm_leads")
      .select(
        `*,
        admin_crm_notes(id, note, admin_user_id, created_at),
        admin_crm_payment_overrides(id, old_payment_status, new_payment_status, reason, reference, amount, should_activate_user, created_at)`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (paymentStatus && paymentStatuses.has(paymentStatus as AdminCrmPaymentStatus)) {
      query = query.eq("payment_status", paymentStatus);
    }

    if (leadStatus && leadStatuses.has(leadStatus as AdminCrmLeadStatus)) {
      query = query.eq("lead_status", leadStatus);
    }

    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(`name.ilike.${like},email.ilike.${like},whatsapp.ilike.${like},referral_code.ilike.${like},affiliate_code.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

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
    return c.json({ error: error.message || "Failed to load CRM leads" }, 500);
  }
};

export const updateAdminCrmLead = async (c: Context<{ Bindings: Env }>) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const body = await c.req.json();

    const updates: Record<string, unknown> = {};

    if (body.lead_status !== undefined) {
      if (!leadStatuses.has(body.lead_status)) return c.json({ error: "Invalid lead_status" }, 400);
      updates.lead_status = body.lead_status;
    }

    if (body.payment_status !== undefined) {
      if (!paymentStatuses.has(body.payment_status)) return c.json({ error: "Invalid payment_status" }, 400);
      updates.payment_status = body.payment_status;
    }

    for (const key of ["last_contacted_at", "next_followup_at", "manual_payment_reference", "checkout_url"] as const) {
      if (body[key] !== undefined) updates[key] = body[key] || null;
    }

    if (body.amount !== undefined) updates.amount = Number(body.amount || 0);

    if (Object.keys(updates).length === 0) return c.json({ error: "No allowed field to update" }, 400);

    const { data: before } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await insertAdminCrmAuditLog(admin.supabaseAdmin, {
      actorUserId: admin.user.id,
      action: "admin_crm_lead_update",
      targetType: "admin_crm_lead",
      targetId: id,
      metadata: { before, updates },
    });

    return c.json({ lead: data });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to update CRM lead" }, 500);
  }
};

export const markAdminCrmLeadContacted = async (c: Context<{ Bindings: Env }>) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const now = new Date().toISOString();

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .update({ lead_status: "contacted", last_contacted_at: now })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await insertAdminCrmAuditLog(admin.supabaseAdmin, {
      actorUserId: admin.user.id,
      action: "admin_crm_mark_contacted",
      targetType: "admin_crm_lead",
      targetId: id,
      metadata: { at: now },
    });

    return c.json({ lead: data });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to mark contacted" }, 500);
  }
};

export const createAdminCrmNote = async (c: Context<{ Bindings: Env }>) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { note } = await c.req.json();
    const cleanNote = safeText(note);
    if (cleanNote.length < 2) return c.json({ error: "Catatan terlalu pendek" }, 400);

    const { data, error } = await admin.supabaseAdmin
      .from("admin_crm_notes")
      .insert({ lead_id: id, admin_user_id: admin.user.id, note: cleanNote })
      .select()
      .single();

    if (error) throw error;

    await insertAdminCrmAuditLog(admin.supabaseAdmin, {
      actorUserId: admin.user.id,
      action: "admin_crm_note_create",
      targetType: "admin_crm_lead",
      targetId: id,
      metadata: { note_id: data.id },
    });

    return c.json({ note: data });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to create note" }, 500);
  }
};

export const createAdminCrmManualPaymentOverride = async (c: Context<{ Bindings: Env }>) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const body = await c.req.json();
    const reason = safeText(body.reason);
    if (reason.length < 8) return c.json({ error: "Alasan wajib minimal 8 karakter" }, 400);

    const newPaymentStatus = body.new_payment_status || "paid_manual";
    if (!paymentStatuses.has(newPaymentStatus)) return c.json({ error: "Invalid new_payment_status" }, 400);

    const { data: lead, error: leadErr } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (leadErr) throw leadErr;
    if (!lead) return c.json({ error: "Lead not found" }, 404);

    const amount = body.amount !== undefined ? Number(body.amount || 0) : Number(lead.amount || 0);
    const idempotencyKey = body.idempotency_key || `manual:${id}:${newPaymentStatus}:${amount}:${reason.toLowerCase()}`;

    const { data: override, error: overrideErr } = await admin.supabaseAdmin
      .from("admin_crm_payment_overrides")
      .insert({
        lead_id: id,
        admin_user_id: admin.user.id,
        old_payment_status: lead.payment_status,
        new_payment_status: newPaymentStatus,
        reason,
        reference: safeText(body.reference) || null,
        amount,
        should_activate_user: Boolean(body.should_activate_user),
        activated_user_id: body.should_activate_user ? lead.user_id : null,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (overrideErr) {
      if (overrideErr.code === "23505") return c.json({ error: "Override ini sudah pernah diproses" }, 409);
      throw overrideErr;
    }

    const { data: updatedLead, error: updateErr } = await admin.supabaseAdmin
      .from("admin_crm_leads")
      .update({
        payment_status: newPaymentStatus,
        lead_status: newPaymentStatus === "paid_manual" || newPaymentStatus === "paid" ? "paid" : lead.lead_status,
        manual_payment_reference: safeText(body.reference) || lead.manual_payment_reference || null,
        amount,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    if (body.should_activate_user && lead.user_id) {
      await admin.supabaseAdmin.auth.admin.updateUserById(lead.user_id, {
        app_metadata: { siklusio_access_status: "active" },
      });
    }

    await insertAdminCrmAuditLog(admin.supabaseAdmin, {
      actorUserId: admin.user.id,
      action: "admin_crm_manual_payment_override",
      targetType: "admin_crm_lead",
      targetId: id,
      metadata: { override_id: override.id, new_payment_status: newPaymentStatus, amount },
    });

    return c.json({ lead: updatedLead, override });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to create manual payment override" }, 500);
  }
};
```

---

## 6) Register CRM routes

Edit file:
`backend/src/routes/admin.route.ts`

Tambahkan import:

```ts
import {
  getAdminCrmLeads,
  updateAdminCrmLead,
  markAdminCrmLeadContacted,
  createAdminCrmNote,
  createAdminCrmManualPaymentOverride,
} from "../controllers/adminCrm.controller";
```

Tambahkan route:

```ts
router.get("/api/admin/crm/leads", getAdminCrmLeads);
router.patch("/api/admin/crm/leads/:id", updateAdminCrmLead);
router.post("/api/admin/crm/leads/:id/contacted", markAdminCrmLeadContacted);
router.post("/api/admin/crm/leads/:id/notes", createAdminCrmNote);
router.post("/api/admin/crm/leads/:id/payment-override", createAdminCrmManualPaymentOverride);
```

---

## 7) Buat panel CRM frontend

Buat file baru:
`mobile-app/src/features/admin/AdminCrmPanel.tsx`

```tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { apiGetJson, apiPatchJson, apiPostJson } from "@/src/lib/api";

type ViewMode = "list" | "kanban" | "detail";
type PaymentStatus = "new" | "checkout_started" | "pending_payment" | "paid" | "paid_manual" | "failed" | "cancelled" | "refunded";
type LeadStatus = "new_lead" | "contacted" | "interested" | "checkout_started" | "pending_payment" | "paid" | "onboarded" | "no_response" | "not_interested";

type CrmLead = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string;
  referral_code: string | null;
  affiliate_code: string | null;
  lead_status: LeadStatus;
  payment_status: PaymentStatus;
  checkout_url: string | null;
  mayar_transaction_id: string | null;
  manual_payment_reference: string | null;
  amount: number | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
  admin_crm_notes?: Array<{ id: string; note: string; created_at: string }>;
  admin_crm_payment_overrides?: Array<{ id: string; reason: string; reference: string | null; amount: number | null; created_at: string }>;
};

type CrmResponse = {
  leads: CrmLead[];
  count: number;
  limit: number;
  offset: number;
  stats: Record<string, number> & { total: number; revenue: number };
};

const paymentOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "new", label: "Baru" },
  { value: "checkout_started", label: "Checkout" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Lunas" },
  { value: "paid_manual", label: "Lunas Manual" },
  { value: "failed", label: "Gagal" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Refund" },
];

const leadOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: "new_lead", label: "Lead Baru" },
  { value: "contacted", label: "Sudah Dihubungi" },
  { value: "interested", label: "Tertarik" },
  { value: "checkout_started", label: "Mulai Checkout" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Paid" },
  { value: "onboarded", label: "Onboarded" },
  { value: "no_response", label: "Tidak Respon" },
  { value: "not_interested", label: "Tidak Tertarik" },
];

const kanbanColumns: Array<{ key: PaymentStatus; title: string }> = [
  { key: "pending_payment", title: "Menunggu Bayar" },
  { key: "paid", title: "Lunas" },
  { key: "paid_manual", title: "Lunas Manual" },
  { key: "failed", title: "Gagal" },
  { key: "cancelled", title: "Dibatalkan" },
];

function formatMoney(value?: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

function statusLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((o) => o.value === value)?.label || value;
}

function webPrompt(message: string, fallback = "") {
  if (Platform.OS === "web") return window.prompt(message, fallback);
  return fallback;
}

export default function AdminCrmPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [stats, setStats] = useState<CrmResponse["stats"]>({ total: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualAmount, setManualAmount] = useState("37000");

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedId) || leads[0] || null, [leads, selectedId]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (query.trim()) params.set("q", query.trim());
      if (paymentFilter !== "all") params.set("payment_status", paymentFilter);
      const data = await apiGetJson<CrmResponse>(`/api/admin/crm/leads?${params.toString()}`);
      setLeads(data.leads || []);
      setStats(data.stats || { total: 0, revenue: 0 });
      if (!selectedId && data.leads?.[0]) setSelectedId(data.leads[0].id);
    } catch (err: any) {
      setError(err.message || "Gagal memuat CRM.");
    } finally {
      setLoading(false);
    }
  }, [paymentFilter, query, selectedId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const updateLead = async (lead: CrmLead, updates: Partial<Pick<CrmLead, "payment_status" | "lead_status" | "next_followup_at">>) => {
    setSavingId(lead.id);
    try {
      const data = await apiPatchJson<{ lead: CrmLead }>(`/api/admin/crm/leads/${lead.id}`, updates);
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? data.lead : item)));
    } catch (err: any) {
      const msg = err.message || "Gagal update lead.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Gagal", msg);
    } finally {
      setSavingId(null);
    }
  };

  const markContacted = async (lead: CrmLead) => {
    setSavingId(lead.id);
    try {
      const data = await apiPostJson<{ lead: CrmLead }>(`/api/admin/crm/leads/${lead.id}/contacted`, {});
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? data.lead : item)));
    } catch (err: any) {
      const msg = err.message || "Gagal menandai dihubungi.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Gagal", msg);
    } finally {
      setSavingId(null);
    }
  };

  const addNote = async () => {
    if (!selectedLead || noteText.trim().length < 2) return;
    setSavingId(selectedLead.id);
    try {
      await apiPostJson(`/api/admin/crm/leads/${selectedLead.id}/notes`, { note: noteText.trim() });
      setNoteText("");
      await loadLeads();
    } catch (err: any) {
      const msg = err.message || "Gagal menyimpan catatan.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Gagal", msg);
    } finally {
      setSavingId(null);
    }
  };

  const applyManualPaid = async () => {
    if (!selectedLead) return;
    if (manualReason.trim().length < 8) {
      const msg = "Alasan wajib minimal 8 karakter.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Validasi", msg);
      return;
    }
    setSavingId(selectedLead.id);
    try {
      const data = await apiPostJson<{ lead: CrmLead }>(`/api/admin/crm/leads/${selectedLead.id}/payment-override`, {
        new_payment_status: "paid_manual",
        reason: manualReason.trim(),
        reference: manualReference.trim() || null,
        amount: Number(manualAmount || selectedLead.amount || 37000),
        should_activate_user: true,
      });
      setLeads((prev) => prev.map((item) => (item.id === selectedLead.id ? data.lead : item)));
      setManualReason("");
      setManualReference("");
      await loadLeads();
    } catch (err: any) {
      const msg = err.message || "Gagal override pembayaran.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Gagal", msg);
    } finally {
      setSavingId(null);
    }
  };

  const copyWa = (lead: CrmLead) => {
    const phone = (lead.whatsapp || "").replace(/[^0-9]/g, "");
    const normalized = phone.startsWith("0") ? `62${phone.slice(1)}` : phone;
    const text = `Halo Bunda ${lead.name || ""}, saya dari Siklusio. Mau bantu cek status akses/pembayaran Bunda ya.`;
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
    if (Platform.OS === "web") window.open(url, "_blank");
  };

  const renderStatusSelect = (lead: CrmLead) => {
    if (Platform.OS === "web") {
      return (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <select
            value={lead.payment_status}
            onChange={(event) => updateLead(lead, { payment_status: event.currentTarget.value as PaymentStatus })}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #fbcfe8", fontWeight: 700 }}
          >
            {paymentOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={lead.lead_status}
            onChange={(event) => updateLead(lead, { lead_status: event.currentTarget.value as LeadStatus })}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd6fe", fontWeight: 700 }}
          >
            {leadOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <TouchableOpacity style={styles.miniButton} onPress={() => updateLead(lead, { payment_status: "paid_manual" })}>
          <Text style={styles.miniButtonText}>Lunas Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.miniButton, styles.dangerButton]} onPress={() => updateLead(lead, { payment_status: "failed" })}>
          <Text style={styles.miniButtonText}>Gagal</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLeadCard = (lead: CrmLead, compact = false) => (
    <TouchableOpacity
      key={lead.id}
      style={[styles.leadCard, selectedId === lead.id && styles.leadCardActive]}
      onPress={() => {
        setSelectedId(lead.id);
        if (viewMode !== "detail" && !compact) setViewMode("detail");
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.leadName}>{lead.name || "Tanpa Nama"}</Text>
          <Text style={styles.leadMeta}>{lead.email || "-"} • {lead.whatsapp || "-"}</Text>
          <Text style={styles.leadSmall}>Sumber: {lead.source || "-"} • {formatDate(lead.created_at)}</Text>
        </View>
        {savingId === lead.id ? <ActivityIndicator /> : <FontAwesome name="chevron-right" size={14} color="#94a3b8" />}
      </View>
      <View style={styles.badgeRow}>
        <Text style={[styles.badge, styles.pinkBadge]}>{statusLabel(paymentOptions, lead.payment_status)}</Text>
        <Text style={[styles.badge, styles.tealBadge]}>{statusLabel(leadOptions, lead.lead_status)}</Text>
        <Text style={[styles.badge, styles.purpleBadge]}>{formatMoney(lead.amount)}</Text>
      </View>
      {!compact && <View style={{ marginTop: 12 }}>{renderStatusSelect(lead)}</View>}
    </TouchableOpacity>
  );

  const grouped = useMemo(() => {
    return kanbanColumns.reduce<Record<string, CrmLead[]>>((acc, column) => {
      acc[column.key] = leads.filter((lead) => lead.payment_status === column.key);
      return acc;
    }, {});
  }, [leads]);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.title}>💗 CRM Admin 🌸</Text>
        <Text style={styles.subtitle}>Pantau lead, follow-up WhatsApp, status pembayaran, dan override manual dalam satu tempat.</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}><Text style={styles.statLabel}>Total Lead</Text><Text style={styles.statValue}>{stats.total || 0}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Pending</Text><Text style={[styles.statValue, { color: "#f59e0b" }]}>{stats.pending_payment || 0}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Lunas</Text><Text style={[styles.statValue, { color: "#14b8a6" }]}>{(stats.paid || 0) + (stats.paid_manual || 0)}</Text></View>
        <View style={styles.statCard}><Text style={styles.statLabel}>Revenue</Text><Text style={[styles.statValue, { color: "#06b6d4" }]}>{formatMoney(stats.revenue)}</Text></View>
      </View>

      <View style={styles.toolbar}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Cari nama, email, WA, referral..." style={styles.searchInput} />
        <TouchableOpacity style={styles.primaryButton} onPress={loadLeads}><Text style={styles.primaryButtonText}>Cari</Text></TouchableOpacity>
      </View>

      <View style={styles.segmentRow}>
        {(["list", "kanban", "detail"] as ViewMode[]).map((mode) => (
          <TouchableOpacity key={mode} style={[styles.segment, viewMode === mode && styles.segmentActive]} onPress={() => setViewMode(mode)}>
            <Text style={[styles.segmentText, viewMode === mode && styles.segmentTextActive]}>{mode === "list" ? "List" : mode === "kanban" ? "Kanban" : "Detail"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {([{ value: "all", label: "Semua" }, ...paymentOptions] as Array<{ value: PaymentStatus | "all"; label: string }>).map((option) => (
          <TouchableOpacity key={option.value} style={[styles.filterPill, paymentFilter === option.value && styles.filterPillActive]} onPress={() => setPaymentFilter(option.value)}>
            <Text style={[styles.filterPillText, paymentFilter === option.value && styles.filterPillTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginVertical: 24 }} /> : null}

      {viewMode === "list" && <View>{leads.map((lead) => renderLeadCard(lead))}</View>}

      {viewMode === "kanban" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {kanbanColumns.map((column) => (
            <View key={column.key} style={styles.kanbanColumn}>
              <Text style={styles.kanbanTitle}>{column.title} ({grouped[column.key]?.length || 0})</Text>
              {(grouped[column.key] || []).map((lead) => renderLeadCard(lead, true))}
            </View>
          ))}
        </ScrollView>
      )}

      {viewMode === "detail" && selectedLead && (
        <View style={styles.detailCard}>
          {renderLeadCard(selectedLead, true)}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ganti Status Cepat</Text>
            {renderStatusSelect(selectedLead)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aksi Follow-up</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <TouchableOpacity style={styles.tealButton} onPress={() => markContacted(selectedLead)}><Text style={styles.primaryButtonText}>Tandai Dihubungi</Text></TouchableOpacity>
              <TouchableOpacity style={styles.greenButton} onPress={() => copyWa(selectedLead)}><Text style={styles.primaryButtonText}>Buka WA Follow-up</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionWarning}>
            <Text style={styles.sectionTitle}>Manual Payment Override 🛡️</Text>
            <Text style={styles.warningText}>Gunakan hanya setelah bukti transfer valid. Semua aksi dicatat ke audit log.</Text>
            <TextInput value={manualReason} onChangeText={setManualReason} placeholder="Alasan wajib, min. 8 karakter" style={styles.input} />
            <TextInput value={manualReference} onChangeText={setManualReference} placeholder="Referensi/bukti transfer" style={styles.input} />
            <TextInput value={manualAmount} onChangeText={setManualAmount} placeholder="Nominal" keyboardType="numeric" style={styles.input} />
            <TouchableOpacity style={styles.successButton} onPress={applyManualPaid}><Text style={styles.primaryButtonText}>Aktifkan Lunas Manual</Text></TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catatan Follow-up Admin</Text>
            <TextInput value={noteText} onChangeText={setNoteText} placeholder="Tulis catatan follow-up..." style={[styles.input, { minHeight: 80 }]} multiline />
            <TouchableOpacity style={styles.primaryButton} onPress={addNote}><Text style={styles.primaryButtonText}>Simpan Catatan</Text></TouchableOpacity>
            {(selectedLead.admin_crm_notes || []).map((note) => (
              <View key={note.id} style={styles.noteBox}>
                <Text style={styles.noteText}>{note.note}</Text>
                <Text style={styles.leadSmall}>{formatDate(note.created_at)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles: Record<string, any> = {
  wrap: { padding: 16, gap: 14 },
  hero: { backgroundColor: "#fff", borderColor: "#fbcfe8", borderWidth: 1, borderRadius: 24, padding: 20 },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  subtitle: { marginTop: 8, color: "#64748b", fontSize: 15 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flexGrow: 1, minWidth: 180, backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f1e8ff" },
  statLabel: { color: "#64748b", fontWeight: "800" },
  statValue: { marginTop: 8, color: "#ec4899", fontSize: 24, fontWeight: "900" },
  toolbar: { flexDirection: "row", gap: 10 },
  searchInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButton: { backgroundColor: "#ec4899", borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: { borderWidth: 1, borderColor: "#e9d5ff", backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  segmentActive: { backgroundColor: "#9333ea", borderColor: "#9333ea" },
  segmentText: { color: "#475569", fontWeight: "900" },
  segmentTextActive: { color: "#fff" },
  filterPill: { marginRight: 8, borderWidth: 1, borderColor: "#e9d5ff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fff" },
  filterPillActive: { backgroundColor: "#ec4899", borderColor: "#ec4899" },
  filterPillText: { color: "#475569", fontWeight: "800" },
  filterPillTextActive: { color: "#fff" },
  error: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 12, fontWeight: "700" },
  leadCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#fbcfe8", borderRadius: 22, padding: 16, marginBottom: 12 },
  leadCardActive: { borderColor: "#ec4899", shadowColor: "#ec4899", shadowOpacity: 0.12, shadowRadius: 12 },
  leadName: { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  leadMeta: { marginTop: 5, color: "#64748b", fontSize: 14 },
  leadSmall: { marginTop: 4, color: "#94a3b8", fontSize: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontWeight: "900", overflow: "hidden" },
  pinkBadge: { backgroundColor: "#fdf2f8", color: "#be185d" },
  tealBadge: { backgroundColor: "#ccfbf1", color: "#0f766e" },
  purpleBadge: { backgroundColor: "#f3e8ff", color: "#7e22ce" },
  miniButton: { backgroundColor: "#14b8a6", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  miniButtonText: { color: "#fff", fontWeight: "900" },
  dangerButton: { backgroundColor: "#ef4444" },
  tealButton: { backgroundColor: "#14b8a6", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  greenButton: { backgroundColor: "#22c55e", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  successButton: { backgroundColor: "#16a34a", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, alignSelf: "flex-start" },
  kanbanColumn: { width: 320, marginRight: 12, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 20, padding: 12 },
  kanbanTitle: { color: "#0f172a", fontWeight: "900", marginBottom: 10 },
  detailCard: { backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#fbcfe8", padding: 16 },
  section: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  sectionWarning: { marginTop: 16, padding: 16, borderWidth: 1, borderColor: "#fed7aa", backgroundColor: "#fff7ed", borderRadius: 18 },
  sectionTitle: { color: "#0f172a", fontWeight: "900", fontSize: 16, marginBottom: 10 },
  warningText: { color: "#c2410c", marginBottom: 10 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  noteBox: { marginTop: 10, backgroundColor: "#f8fafc", borderRadius: 14, padding: 12 },
  noteText: { color: "#334155", fontWeight: "600" },
};
```

---

## 8) Pasang panel CRM di halaman admin

Edit file:
`mobile-app/app/admin.tsx`

Tambahkan import:

```tsx
import AdminCrmPanel from "@/src/features/admin/AdminCrmPanel";
```

Ubah tipe `activeTab` dari:

```tsx
const [activeTab, setActiveTab] = useState<"users" | "moderation" | "coupons" | "affiliates">("users");
```

menjadi:

```tsx
const [activeTab, setActiveTab] = useState<"users" | "crm" | "moderation" | "coupons" | "affiliates">("users");
```

Di area tombol tab admin, tambahkan tombol CRM:

```tsx
<TouchableOpacity
  style={[styles.tabButton, activeTab === "crm" && styles.activeTab]}
  onPress={() => setActiveTab("crm")}
>
  <Text style={[styles.tabText, activeTab === "crm" && styles.activeTabText]}>🌸 CRM</Text>
</TouchableOpacity>
```

Di area render konten, tambahkan sebelum moderation/coupons/affiliates:

```tsx
{activeTab === "crm" && <AdminCrmPanel />}
```

Jangan hapus panel existing user/moderation/coupon/affiliate.

---

## 9) Backfill lead lama yang belum masuk CRM

Buat script SQL sementara dan jalankan sekali di Supabase SQL Editor setelah migration:

```sql
insert into public.admin_crm_leads (
  user_id,
  name,
  email,
  whatsapp,
  source,
  referral_code,
  affiliate_code,
  lead_status,
  payment_status,
  checkout_url,
  mayar_transaction_id,
  amount,
  created_at,
  updated_at
)
select
  pr.user_id,
  pr.name,
  lower(pr.email),
  pr.whatsapp,
  'backfill_pending_registration',
  pr.coupon_code,
  pr.affiliate_code,
  'pending_payment'::public.admin_crm_lead_status,
  'pending_payment'::public.admin_crm_payment_status,
  cs.mayar_link,
  cs.mayar_transaction_id,
  cs.final_amount,
  pr.created_at,
  now()
from public.pending_registrations pr
left join lateral (
  select * from public.checkout_sessions cs
  where lower(cs.email) = lower(pr.email)
  order by cs.created_at desc
  limit 1
) cs on true
where not exists (
  select 1 from public.admin_crm_leads l
  where lower(l.email) = lower(pr.email)
);

insert into public.admin_crm_leads (
  name,
  email,
  whatsapp,
  source,
  referral_code,
  affiliate_code,
  lead_status,
  payment_status,
  checkout_url,
  mayar_transaction_id,
  amount,
  created_at,
  updated_at
)
select
  cs.name,
  lower(cs.email),
  cs.whatsapp,
  'backfill_checkout_session',
  cs.coupon_code,
  cs.affiliate_code,
  case when cs.status in ('paid', 'free_bypass') then 'paid' else 'checkout_started' end::public.admin_crm_lead_status,
  case when cs.status = 'paid' then 'paid'
       when cs.status = 'free_bypass' then 'paid_manual'
       else 'pending_payment'
  end::public.admin_crm_payment_status,
  cs.mayar_link,
  cs.mayar_transaction_id,
  cs.final_amount,
  cs.created_at,
  now()
from public.checkout_sessions cs
where not exists (
  select 1 from public.admin_crm_leads l
  where lower(l.email) = lower(cs.email)
);
```

---

## 10) Acceptance test wajib

Jalankan:

```bash
npm run check
npm --prefix mobile-app run typecheck
```

Lalu test manual:
1. Daftar user baru dari checkout normal.
2. Pastikan row muncul di `admin_crm_leads` dengan `payment_status = pending_payment`.
3. Buka Admin Portal → CRM → List. Lead baru harus muncul.
4. Ganti dropdown payment status ke `failed`. Harus berubah tanpa refresh manual.
5. Ganti balik ke `pending_payment`.
6. Isi Manual Payment Override dengan alasan valid dan nominal 37000. Klik aktifkan. Lead berubah `paid_manual` dan audit log masuk.
7. Simulasikan webhook Mayar sukses. Lead berubah `paid`.
8. Test search nama/email/WA.
9. Test Kanban grouping.
10. Test Detail catatan follow-up.

