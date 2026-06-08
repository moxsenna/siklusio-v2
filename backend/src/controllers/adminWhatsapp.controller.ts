import type { Env } from "../env";
import { getAdminAuth, type AdminHandlerContext } from "../middlewares/auth";
import {
  normalizeWhatsapp,
  renderWhatsappTemplate,
  sendFonnteMessage,
} from "../services/fonnte";
import { logError } from "../logging/redaction";

type AdminContext = AdminHandlerContext;

const allowedEvents = new Set([
  "registration_completed",
  "payment_completed",
]);

const allowedStatuses = new Set([
  "pending",
  "sent",
  "failed",
  "skipped",
]);

const dummyContext = {
  nama: "Bunda Rani",
  email: "rani@example.com",
  no_hp: "081234567890",
  link_pembayaran: "https://imayar.link/contoh",
  jumlah_pembayaran: "Rp 37.000",
  status_pembayaran: "Berhasil",
  kode_kupon: "PROMIL10",
  kode_affiliate: "BUNDAJASMINE",
  link_login: "https://app.siklusio.web.id/auth",
  tanggal: new Date().toLocaleDateString("id-ID"),
  transaction_id: "trx_dummy_123",
};

export const getAdminWhatsappSettings = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const { data, error } = await admin.supabaseAdmin
      .from("whatsapp_autoresponder_settings")
      .select("*");

    if (error) throw error;

    // Ensure stable display order
    const settings = (data || []).sort((a: any, b: any) => {
      const order = { registration_completed: 1, payment_completed: 2 };
      const orderA = order[a.event_key as keyof typeof order] || 99;
      const orderB = order[b.event_key as keyof typeof order] || 99;
      return orderA - orderB;
    });

    return c.json({
      settings,
      placeholders: Object.keys(dummyContext).map((key) => `{{${key}}}`),
    });
  } catch (error: any) {
    logError("getAdminWhatsappSettings failed:", error);
    return c.json({ error: error.message || "Gagal memuat pengaturan WhatsApp." }, 500);
  }
};

export const updateAdminWhatsappSetting = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const eventKey = c.req.param("eventKey");
    if (!allowedEvents.has(eventKey)) {
      return c.json({ error: "Event autoresponder tidak valid." }, 400);
    }

    const body = await c.req.json();
    const updates: Record<string, unknown> = {
      updated_by: admin.user.id,
    };

    if (body.is_enabled !== undefined) updates.is_enabled = Boolean(body.is_enabled);

    if (body.message_template !== undefined) {
      const template = String(body.message_template || "").trim();
      if (template.length < 20) {
        return c.json({ error: "Template pesan minimal 20 karakter." }, 400);
      }
      if (template.length > 60000) {
        return c.json({ error: "Template terlalu panjang." }, 400);
      }
      updates.message_template = template;
    }

    if (body.send_delay_seconds !== undefined) {
      const delay = Number(body.send_delay_seconds);
      if (!Number.isFinite(delay) || delay < 0 || delay > 86400) {
        return c.json({ error: "Delay harus 0 sampai 86400 detik." }, 400);
      }
      updates.send_delay_seconds = Math.floor(delay);
    }

    const { data, error } = await admin.supabaseAdmin
      .from("whatsapp_autoresponder_settings")
      .update(updates as any)
      .eq("event_key", eventKey as any)
      .select()
      .single();

    if (error) throw error;

    return c.json({ setting: data });
  } catch (error: any) {
    logError("updateAdminWhatsappSetting failed:", error);
    return c.json({ error: error.message || "Gagal menyimpan pengaturan WhatsApp." }, 500);
  }
};

export const previewAdminWhatsappTemplate = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const body = await c.req.json();
    const template = String(body.message_template || "");

    if (template.length > 60000) {
      return c.json({ error: "Template terlalu panjang (maksimal 60.000 karakter)." }, 400);
    }

    if (!template.trim()) {
      return c.json({
        preview: "",
        warnings: ["Template masih kosong."],
      });
    }

    return c.json({
      preview: renderWhatsappTemplate(template, dummyContext),
      dummyContext,
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Gagal membuat preview." }, 500);
  }
};

export const sendAdminWhatsappTest = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const body = await c.req.json();
    const eventKey = String(body.eventKey || "");
    if (!allowedEvents.has(eventKey)) {
      return c.json({ error: "Event autoresponder tidak valid." }, 400);
    }

    const target = normalizeWhatsapp(body.target);
    if (!target) {
      return c.json({ error: "Nomor WhatsApp tujuan wajib diisi dengan format valid." }, 400);
    }

    const message = renderWhatsappTemplate(String(body.message_template || ""), dummyContext);

    const providerResponse = await sendFonnteMessage(c, {
      target,
      message,
      delaySeconds: 0,
    });

    return c.json({ status: "ok", providerResponse });
  } catch (error: any) {
    logError("sendAdminWhatsappTest failed:", error);
    return c.json({ error: error.message || "Gagal mengirim test WhatsApp." }, 500);
  }
};

export const getAdminWhatsappLogs = async (c: AdminContext) => {
  try {
    const admin = getAdminAuth(c);

    const eventKey = c.req.query("event");
    const statusFilter = c.req.query("status");

    let query = admin.supabaseAdmin
      .from("whatsapp_autoresponder_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (eventKey) {
      if (!allowedEvents.has(eventKey)) {
        return c.json({ error: "Filter event tidak valid." }, 400);
      }
      query = query.eq("event_key", eventKey as any);
    }

    if (statusFilter) {
      if (!allowedStatuses.has(statusFilter)) {
        return c.json({ error: "Filter status tidak valid." }, 400);
      }
      query = query.eq("status", statusFilter as any);
    }

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ logs: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message || "Gagal memuat log WhatsApp." }, 500);
  }
};
