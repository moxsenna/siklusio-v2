import { Context } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middlewares/auth";
import { getAiCreditBalance, chargeAiCredits } from "../services/aiCreditLedger";
import { resolveOpenRouterModels } from "../ai/modelPolicy";
import { callOpenRouterJson } from "../ai/openRouter";
import { logInfo, logError } from "../logging/redaction";
import {
  validateCycleReport,
  validateHabitsInsight,
  validateCalmingReassurance,
  cycleReportSchema,
  habitsInsightSchema,
  calmingReassuranceSchema,
} from "../schemas/requestSchemas";
import { aiSafetyEnvelope } from "../ai/safety";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date string (YYYY-MM-DD) in WIB (UTC+7).
 */
function getTodayWib(): string {
  const now = new Date();
  // UTC+7 offset in ms
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffset);
  return wibDate.toISOString().slice(0, 10);
}

/**
 * Validates that the client-supplied generatedForDate is within ±1 day
 * of today in WIB. Returns false if the date is invalid or out of range.
 */
function isDateValidForToday(clientDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return false;
  const todayWib = getTodayWib();
  const today = new Date(todayWib + "T00:00:00Z");
  const client = new Date(clientDate + "T00:00:00Z");
  const diffDays = Math.abs((client.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 1;
}

/**
 * SHA-256 hex digest of a string.
 * Uses the Web Crypto API available in Cloudflare Workers.
 */
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// POST /api/generate-cycle-report
// ---------------------------------------------------------------------------
export const generateCycleReport = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Received request /api/generate-cycle-report");
  try {
    const { cycleData, phase, cycleDay, daysToNextPeriod, fertilityWindow, nickname } =
      await c.req.json();
    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);
    }

    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    console.log("--> [BACKEND] Calling OpenRouter API...");
    const modelSelection = resolveOpenRouterModels({
      policy: "free_included",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey,
      ...modelSelection,
      messages: [
        {
          role: "user",
          content: `Analyze the user's menstrual cycle and generate an actionable AI report.
          Context:
          - Current phase: ${phase}
          - Cycle day: ${cycleDay}
          - Days to next period: ${daysToNextPeriod}
          - Fertile window: ${fertilityWindow.start} to ${fertilityWindow.end}
          - Activity & Body Data logic: ${JSON.stringify(cycleData).slice(0, 500)} // limited to avoid massive prompts
          - User nickname: ${nickname || ""}
          
          Write a warm, supportive, and sweet report IN INDONESIAN, specifically tailored for a woman.
          
          TONE AND PERSONALIZATION RULES (CRITICAL):
          1. Address the user directly using her nickname if provided: "${nickname || ""}".
          2. NEVER use the formal word "Anda".
          3. ALWAYS address her warmly as "kamu" and her nickname.
          4. DO NOT call her "Bunda" in the report text (strictly use "kamu" or her actual nickname).
          5. Keep the tone loving, empathetic, and sweet.`,
        },
      ],
      responseSchemaName: "cycle_report",
      responseSchema: cycleReportSchema,
    });

    console.log("--> [BACKEND] Received OpenRouter response.");
    const result = aiSafetyEnvelope(validateCycleReport(ai.data));
    return c.json(result);
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter API Error / Exception:");
    console.error(error.stack || error);
    return c.json(
      { error: error instanceof Error ? error.message || String(error) : "Gagal membuat laporan" },
      500,
    );
  }
};

// ---------------------------------------------------------------------------
// POST /api/generate-habits-insight
// ---------------------------------------------------------------------------
export const generateHabitsInsight = async (c: Context<{ Bindings: Env }>) => {
  console.log("--> [BACKEND] Received request /api/generate-habits-insight");
  try {
    const { weeklyData, currentPhase, nickname } = await c.req.json();
    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);
    }

    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    console.log("--> [BACKEND] Calling OpenRouter API...");
    const modelSelection = resolveOpenRouterModels({
      policy: "free_included",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey,
      ...modelSelection,
      messages: [
        {
          role: "user",
          content: `Kamu adalah asisten kesehatan reproduksi wanita yang hangat dan suportif. Analisis data aktivitas dan gejala 7 hari terakhir pengguna, lalu berikan insight dan saran yang actionable.
 
          Konteks:
          - Nama panggilan: ${nickname || ""}
          - Fase siklus saat ini: ${currentPhase}
          - Data 7 hari terakhir: ${JSON.stringify(weeklyData)}
 
          Berdasarkan data di atas, buatkan analisis dalam Bahasa Indonesia yang:
          1. Ringkas pola aktivitas (berapa persen target tercapai, konsistensi)
          2. Analisis gejala yang muncul (frekuensi, korelasi dengan fase)
          3. Berikan 3 saran spesifik dan praktis untuk minggu depan
          4. Tutup dengan kalimat motivasi yang personal
 
          PENTING & GAYA BAHASA (SANGAT PENTING):
          - Gunakan bahasa yang hangat, suportif, bersahabat, dan tidak menggurui.
          - Panggil pengguna dengan nama panggilannya jika ada: "${nickname || ""}" atau gunakan kata ganti "kamu".
          - JANGAN PERNAH menggunakan kata formal "Anda".
          - JANGAN PERNAH memanggil pengguna dengan sebutan "Bunda" (selalu gunakan "kamu" atau nama panggilannya).
          - Saran harus realistis dan mudah dilakukan.
          - Jika data kosong/sedikit, tetap berikan saran umum yang relevan dengan fase siklus.`,
        },
      ],
      responseSchemaName: "habits_insight",
      responseSchema: habitsInsightSchema,
    });

    console.log("--> [BACKEND] Received OpenRouter response.");
    const result = aiSafetyEnvelope(validateHabitsInsight(ai.data));
    return c.json(result);
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter API Error / Exception:");
    console.error(error.stack || error);
    return c.json(
      { error: error instanceof Error ? error.message || String(error) : "Gagal membuat insight" },
      500,
    );
  }
};

// ---------------------------------------------------------------------------
// GET /api/tww-sanctuary/today
// ---------------------------------------------------------------------------
export const getTodayReassurance = async (c: Context<{ Bindings: Env }>) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const date = c.req.query("date");
    if (!date) {
      return c.json({ error: "Parameter date diperlukan (YYYY-MM-DD)." }, 400);
    }

    const { data: letter, error } = await auth.supabaseAdmin
      .from("tww_sanctuary_letters")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", date)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;

    if (letter && letter.result) {
      letter.result = aiSafetyEnvelope(
        letter.result as any,
      ) as unknown as import("../../../supabase/types/database.types").Json;
    }

    return c.json({ letter: letter ?? null });
  } catch (error: any) {
    logError("[tww-sanctuary/today]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil Surat Tenang." }, 500);
  }
};

// ---------------------------------------------------------------------------
// POST /api/generate-calming-reassurance
// ---------------------------------------------------------------------------
export const generateCalmingReassurance = async (c: Context<{ Bindings: Env }>) => {
  logInfo("--> [BACKEND] Received request /api/generate-calming-reassurance");

  const creditCost = 25;

  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const body = await c.req.json();
    const { nickname, userJournal, generatedForDate } = body;

    // ── 1. Validate generatedForDate ──────────────────────────────────────
    if (typeof generatedForDate !== "string" || !isDateValidForToday(generatedForDate)) {
      return c.json(
        {
          error:
            "Tanggal tidak valid. generatedForDate harus tanggal hari ini (YYYY-MM-DD, WIB ±1 hari).",
        },
        400,
      );
    }

    // ── 2. Check for existing ACTIVE letter today ─────────────────────────
    const { data: existingActive, error: existingActiveError } = await auth.supabaseAdmin
      .from("tww_sanctuary_letters")
      .select("id, result, credit_cost")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", generatedForDate)
      .eq("status", "active")
      .maybeSingle();

    if (existingActiveError) throw existingActiveError;

    if (existingActive) {
      logInfo("[tww-sanctuary] Returning cached letter for today.");
      const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
      return c.json({
        cached: true,
        charged: false,
        letter: existingActive,
        result: aiSafetyEnvelope(existingActive.result as any),
        balance,
      });
    }

    // ── 3. Check for stuck pending_charge row ─────────────────────────────
    const { data: existingPending, error: existingPendingError } = await auth.supabaseAdmin
      .from("tww_sanctuary_letters")
      .select("id, created_at")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", generatedForDate)
      .eq("status", "pending_charge")
      .maybeSingle();

    if (existingPendingError) throw existingPendingError;

    if (existingPending) {
      const ageMs = Date.now() - new Date(existingPending.created_at).getTime();
      if (ageMs < 5 * 60 * 1000) {
        // < 5 minutes — still in progress
        return c.json({ error: "Surat Tenang sedang dalam proses. Coba lagi sebentar." }, 400);
      }
      // Stuck > 5 minutes — mark failed so we can proceed
      logError("[tww-sanctuary] Marking stuck pending row as failed:", existingPending.id);
      await auth.supabaseAdmin
        .from("tww_sanctuary_letters")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", existingPending.id);
    }

    // ── 4. Check for existing FAILED row (already consumed today's slot) ──
    // If a failed row exists and is NOT the stuck one we just handled,
    // we upsert a new row by removing the unique conflict via delete first.
    // Actually with UNIQUE(user_id, generated_for_date) we can have only ONE row
    // per day. After marking pending→failed above (or if a previous failed exists),
    // we need to delete it so we can insert a fresh one.
    const { data: existingFailed } = await auth.supabaseAdmin
      .from("tww_sanctuary_letters")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", generatedForDate)
      .eq("status", "failed")
      .maybeSingle();

    if (existingFailed) {
      await auth.supabaseAdmin
        .from("tww_sanctuary_letters")
        .delete()
        .eq("id", existingFailed.id);
    }

    // ── 5. Credit balance check ───────────────────────────────────────────
    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json(
        { error: "Saldo kredit AI tidak cukup.", balance, required: creditCost },
        402,
      );
    }

    // ── 6. Call OpenRouter AI ─────────────────────────────────────────────
    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);

    logInfo("--> [BACKEND] Calling OpenRouter for TWW Sanctuary...");
    const modelSelection = resolveOpenRouterModels({
      policy: "free_included",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey,
      ...modelSelection,
      messages: [
        {
          role: "user",
          content: `Kamu adalah asisten/sahabat kehamilan yang sangat menenangkan dan berempati. Pengguna bernama ${nickname || ""} sedang berada di masa TWW (Two-Week Wait - penantian setelah ovulasi hingga haid berikutnya).
          Masa ini sangat rentan memicu kecemasan (symptom spotting).
          Ini adalah curahan hatinya (jurnal emosi): "${userJournal}"
 
          Berikan balasan surat yang:
          1. Menvalidasi perasaannya (tidak meremehkan).
          2. Sangat hangat, empatis, bersahabat, dan menyemangati menggunakan kata ganti "kamu" dan nama panggilannya: "${nickname || ""}".
          3. JANGAN PERNAH memanggil/menyebut pengguna dengan sebutan "Bunda" maupun kata formal "Anda" (selalu gunakan "kamu" atau nama panggilannya).
          4. Mengajaknya untuk kembali fokus pada kedamaian saat ini dan mempercayai proses tubuhnya.
          5. Jangan memberikan diagnosa medis atau janji kehamilan palsu.
 
          Output wajib berupa JSON pendek sesuai schema:
          - title: judul hangat maksimal 7 kata, tanpa awalan titik dua, bullet, atau tanda baca.
          - opening: 1 kalimat pembuka personal.
          - validation: 1-2 kalimat validasi perasaan.
          - grounding: 1-2 kalimat ajakan kembali ke saat ini.
          - affirmation: 1 kalimat afirmasi singkat dari sudut pandang "aku".
          - breathingTip: 1 instruksi napas praktis dan lembut.
          - closing: 1 kalimat penutup hangat.
          - reassurance: gabungan opening, validation, grounding, affirmation, dan closing agar app versi lama tetap bisa membaca hasilnya.`,
        },
      ],
      responseSchemaName: "calming_reassurance",
      responseSchema: calmingReassuranceSchema,
    });

    logInfo("--> [BACKEND] Received OpenRouter response for TWW Sanctuary.");
    const result = aiSafetyEnvelope(
      validateCalmingReassurance(ai.data),
    ) as unknown as import("../../../supabase/types/database.types").Json;

    // ── 7. Compute privacy-safe journal fields ────────────────────────────
    const journalText = typeof userJournal === "string" ? userJournal.trim() : "";
    const journalHash = journalText ? await sha256Hex(journalText) : null;
    const journalPreview = journalText ? journalText.slice(0, 240) : null;

    // ── 8. Insert pending row ─────────────────────────────────────────────
    const { data: savedLetter, error: saveError } = await auth.supabaseAdmin
      .from("tww_sanctuary_letters")
      .insert({
        user_id: auth.user.id,
        generated_for_date: generatedForDate,
        journal_hash: journalHash,
        journal_preview: journalPreview,
        result,
        status: "pending_charge",
        ai_model: ai.model,
        credit_cost: creditCost,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // ── 9. Charge credits (atomic via RPC) ────────────────────────────────
    let balanceAfter: number;
    try {
      balanceAfter = await chargeAiCredits({
        supabaseAdmin: auth.supabaseAdmin,
        userId: auth.user.id,
        amount: creditCost,
        feature: "tww_sanctuary",
        reason: "surat_tenang",
        referenceId: savedLetter.id,
        metadata: { model: ai.model, usage: ai.usage || null },
      });
    } catch (chargeError: any) {
      // Charge failed → mark row failed so the unique slot is freed on next retry
      logError("[tww-sanctuary] Charge failed, marking row failed:", chargeError.message);
      await auth.supabaseAdmin
        .from("tww_sanctuary_letters")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", savedLetter.id);
      throw chargeError;
    }

    // ── 10. Activate row ──────────────────────────────────────────────────
    const { data: activatedLetter, error: activateError } = await auth.supabaseAdmin
      .from("tww_sanctuary_letters")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", savedLetter.id)
      .select()
      .single();

    if (activateError) {
      // CRITICAL: credits already charged but activation failed.
      // Row stays pending_charge; manual recovery needed.
      logError(
        "[tww-sanctuary] CRITICAL: activation failed after charge. Letter ID:",
        savedLetter.id,
        activateError,
      );
      // Still return success to user — they paid, give them the result.
    }

    return c.json({
      cached: false,
      charged: true,
      letter: activatedLetter ?? savedLetter,
      result,
      balance: balanceAfter,
    });
  } catch (error: any) {
    logError("<-- [BACKEND] TWW Sanctuary Error:", error.stack || error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message || String(error) : "Gagal membuat pesan penenang",
      },
      500,
    );
  }
};
