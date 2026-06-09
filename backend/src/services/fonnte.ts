import type { BindingsContext } from "../middlewares/auth";
import { logError, logInfo, logWarn } from "../logging/redaction";

export type WhatsappAutoresponderEvent = "registration_completed" | "payment_completed";

type TemplateContext = Record<string, string | number | null | undefined>;

type SendAutoresponderInput = {
  c: BindingsContext;
  eventKey: WhatsappAutoresponderEvent;
  recipientWhatsapp: string | null | undefined;
  recipientName?: string | null;
  idempotencyKey: string;
  templateContext: TemplateContext;
  metadata?: Record<string, unknown>;
};

const ALLOWED_PLACEHOLDERS = new Set([
  "nama",
  "email",
  "no_hp",
  "link_pembayaran",
  "jumlah_pembayaran",
  "status_pembayaran",
  "kode_kupon",
  "kode_affiliate",
  "link_login",
  "tanggal",
  "transaction_id",
]);

export function normalizeWhatsapp(input?: string | null) {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("62")) {
    digits = digits.slice(2);
  }
  return digits;
}

export function renderWhatsappTemplate(template: string, context: TemplateContext) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey) => {
    const key = String(rawKey).trim();
    if (!ALLOWED_PLACEHOLDERS.has(key)) {
      return `[placeholder_tidak_valid:${key}]`;
    }
    const value = context[key];
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return String(value);
  });
}

export async function sendFonnteMessage(
  c: BindingsContext,
  params: {
    target: string;
    message: string;
    delaySeconds?: number;
  },
) {
  const token = c.env.FONNTE_TOKEN;
  if (!token) {
    throw new Error("FONNTE_TOKEN belum dikonfigurasi.");
  }

  const form = new FormData();
  form.append("target", params.target);
  form.append("message", params.message);
  form.append("countryCode", c.env.FONNTE_COUNTRY_CODE || "62");
  form.append("typing", "true");
  form.append("preview", "true");

  if (params.delaySeconds && params.delaySeconds > 0) {
    form.append("delay", String(params.delaySeconds));
  }

  if (c.env.FONNTE_CONNECT_ONLY === "true") {
    form.append("connectOnly", "true");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: form,
      signal: controller.signal,
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Fonnte HTTP ${response.status}: ${JSON.stringify(json)}`);
    }

    if (!json?.status) {
      throw new Error(json?.reason || json?.detail || "Fonnte gagal mengirim pesan.");
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function insertLogOrSkip(
  supabaseAdmin: any,
  payload: Record<string, unknown>,
  idempotencyKey: string,
) {
  const { error } = await supabaseAdmin.from("whatsapp_autoresponder_logs").insert(payload);

  if (error?.code === "23505") {
    logInfo(`Idempotency duplicate caught on insert log: ${idempotencyKey}`);
    return { duplicated: true };
  }

  if (error) throw error;
  return { duplicated: false };
}

export async function sendWhatsappAutoresponder(input: SendAutoresponderInput) {
  const {
    c,
    eventKey,
    recipientWhatsapp,
    recipientName,
    idempotencyKey,
    templateContext,
    metadata = {},
  } = input;

  const target = normalizeWhatsapp(recipientWhatsapp);
  const supabaseAdmin = (await import("./supabaseAdmin")).getSupabaseAdmin(c);

  // 1. Normalize number. If empty, return status skipped
  if (!target) {
    logWarn(`Skipping WhatsApp autoresponder ${eventKey}: no target`);
    return { status: "skipped" as const, reason: "Nomor WhatsApp kosong." };
  }

  // 2. Check DB log for existing idempotency_key
  const { data: existingLog } = await supabaseAdmin
    .from("whatsapp_autoresponder_logs")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingLog) {
    logInfo(`WhatsApp autoresponder skipped by idempotency: ${idempotencyKey}`);
    return { status: "skipped" as const, reason: "Sudah pernah diproses." };
  }

  // 3. Fetch setting for event_key
  const { data: setting, error: settingError } = await supabaseAdmin
    .from("whatsapp_autoresponder_settings")
    .select("*")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (settingError) throw settingError;

  // 4. If setting is missing, insert a skipped log and return
  if (!setting) {
    const logPayload = {
      event_key: eventKey,
      recipient_whatsapp: target,
      recipient_name: recipientName || null,
      rendered_message: "[setting_not_found]",
      status: "skipped",
      idempotency_key: idempotencyKey,
      metadata: { ...metadata, reason: "setting_not_found" },
    };

    const { duplicated } = await insertLogOrSkip(supabaseAdmin, logPayload, idempotencyKey);
    if (duplicated) {
      return { status: "skipped" as const, reason: "Sudah pernah diproses (duplicate key)." };
    }
    return { status: "skipped" as const, reason: "Setting template tidak ditemukan." };
  }

  // 5. Render template using fetched setting and context
  const renderedMessage = renderWhatsappTemplate(setting.message_template, {
    ...templateContext,
    tanggal: templateContext.tanggal || new Date().toLocaleDateString("id-ID"),
    link_login: templateContext.link_login || "https://app.siklusio.web.id/auth",
  });

  // 6. If disabled, insert skipped log with populated message
  if (!setting.is_enabled) {
    const logPayload = {
      event_key: eventKey,
      recipient_whatsapp: target,
      recipient_name: recipientName || null,
      rendered_message: renderedMessage,
      status: "skipped",
      idempotency_key: idempotencyKey,
      metadata: { ...metadata, reason: "setting_disabled" },
    };

    const { duplicated } = await insertLogOrSkip(supabaseAdmin, logPayload, idempotencyKey);
    if (duplicated) {
      return { status: "skipped" as const, reason: "Sudah pernah diproses (duplicate key)." };
    }
    return { status: "skipped" as const, reason: "Autoresponder nonaktif." };
  }

  // 7. If setting is enabled, insert log as pending
  const logPayload = {
    event_key: eventKey,
    recipient_whatsapp: target,
    recipient_name: recipientName || null,
    rendered_message: renderedMessage,
    status: "pending",
    idempotency_key: idempotencyKey,
    metadata,
  };

  // 8. Catch unique key violation
  const { duplicated } = await insertLogOrSkip(supabaseAdmin, logPayload, idempotencyKey);
  if (duplicated) {
    return { status: "skipped" as const, reason: "Sudah pernah diproses (duplicate key)." };
  }

  // 9. Call Fonnte API
  try {
    const providerResponse = await sendFonnteMessage(c, {
      target,
      message: renderedMessage,
      delaySeconds: Number(setting.send_delay_seconds || 0),
    });

    const providerMessageId = Array.isArray(providerResponse?.id)
      ? providerResponse.id[0]
      : providerResponse?.id;

    // 10. Update DB log on success
    await supabaseAdmin
      .from("whatsapp_autoresponder_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_request_id: providerResponse?.requestid
          ? String(providerResponse.requestid)
          : null,
        provider_message_id: providerMessageId ? String(providerMessageId) : null,
        provider_response: providerResponse,
      })
      .eq("idempotency_key", idempotencyKey);

    return { status: "sent" as const, providerResponse };
  } catch (error: any) {
    logError(`WhatsApp autoresponder failed: ${eventKey}`, error);

    // Update DB log on failure
    await supabaseAdmin
      .from("whatsapp_autoresponder_logs")
      .update({
        status: "failed",
        error_message: error?.message || String(error),
      })
      .eq("idempotency_key", idempotencyKey);

    return { status: "failed" as const, error: error?.message || String(error) };
  }
}
