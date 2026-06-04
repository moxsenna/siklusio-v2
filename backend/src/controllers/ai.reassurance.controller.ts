import { Context } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middlewares/auth";
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

// POST /api/generate-cycle-report
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

// POST /api/generate-habits-insight
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

// POST /api/generate-calming-reassurance
export const generateCalmingReassurance = async (c: Context<{ Bindings: Env }>) => {
  logInfo("--> [BACKEND] Received request /api/generate-calming-reassurance");
  try {
    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    const { nickname, userJournal } = await c.req.json();
    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);
    }

    logInfo("--> [BACKEND] Calling OpenRouter API...");
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

    logInfo("--> [BACKEND] Received OpenRouter response.");
    const result = aiSafetyEnvelope(validateCalmingReassurance(ai.data));
    return c.json(result);
  } catch (error: any) {
    logError("<-- [BACKEND] OpenRouter API Error / Exception:", error.stack || error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message || String(error) : "Gagal membuat pesan penenang",
      },
      500,
    );
  }
};
