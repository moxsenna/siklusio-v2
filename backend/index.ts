import { Hono } from "hono";
import { cors } from "hono/cors";
import { Buffer } from "node:buffer";
import { detectAvatarImage } from "./storage/avatarImage";
import { logInfo, logWarn, logError } from "./logging/redaction";
import { createRateLimitMiddleware } from "./rateLimit";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { callOpenRouterJson } from "./ai/openRouter";
import { resolveOpenRouterModels } from "./ai/modelPolicy";
import { chargeAiCredits, getAiCreditBalance, grantPremiumInitialAiCredits } from "./ai/credits";
import { getAiCreditHistory } from "./ai/history";
import { buildCycleGuideMessages, buildHabitCoachMessages } from "./ai/prompts";
import {
  cycleGuideSchema,
  habitCoachPlanSchema,
  validateCycleGuide,
  validateHabitCoachPlan,
  recipesGenerationSchema,
  cycleReportSchema,
  habitsInsightSchema,
  calmingReassuranceSchema,
  validateRecipesGeneration,
  validateCycleReport,
  validateHabitsInsight,
  validateCalmingReassurance,
} from "./ai/schemas";
import { summarizeActivityHistory } from "./ai/habitSummary";
import { buildCycleGuideSnapshot } from "./ai/cycleGuideSummary";
import { buildRecipeCycleSnapshot } from "./ai/recipeSummary";
import { type HabitCoachCycleDay } from "./ai/habitCoachFoundation";
import {
  buildHabitCoachActiveOverlapConflict,
  saveHabitCoachPlanWithCharge,
} from "./ai/habitCoachPlanLifecycle";
import { isDateKey, isValidHabitCoachWindow, shouldReplaceActivePlan } from "./ai/habitCoachWindow";

// Define the environment bindings type for Cloudflare Workers
interface Env {
  OPENROUTER_API_KEY: string;
  OPENROUTER_FREE_MODEL?: string;
  OPENROUTER_PAID_MODEL?: string;
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  MAYAR_API_KEY: string;
  MAYAR_WEBHOOK_TOKEN?: string;
}

const app = new Hono<{ Bindings: Env }>();

const TRUSTED_ORIGINS = [
  "https://app.siklusio.web.id",
  "https://siklusio.web.id",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

// Enable dynamic CORS allowlist for trusted origins (Phase 2 hardening)
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return origin; // Allow no-origin requests (native/mobile/server calls)
      if (TRUSTED_ORIGINS.includes(origin)) {
        return origin;
      }
      const allowedEnv = c.env?.ALLOWED_ORIGINS;
      if (allowedEnv) {
        const list = allowedEnv.split(",").map((o: string) => o.trim());
        if (list.includes(origin)) {
          return origin;
        }
      }
      return undefined;
    },
  })
);

// Enable global rate limiting middleware (Phase 9 rate limiting)
app.use("*", createRateLimitMiddleware());

// Helper to initialize Supabase Admin client
const getSupabaseAdmin = (c: any) => {
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

// Helper to list all users from Supabase Auth (admin feature)
const listAllAuthUsers = async (supabaseAdmin: any) => {
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

// Middleware/helper to require authenticated user session
const requireUser = async (c: any) => {
  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

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

// Helper to require admin access (returns supabaseAdmin + user or sends 401/403)
const requireAdmin = async (c: any) => {
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

// ------------------------------------------------------------
// API Routes
// ------------------------------------------------------------

const normalizeHabitCoachCycleDays = (
  value: unknown,
  dateKeys: string[],
  cycleSnapshot: Record<string, unknown>
): HabitCoachCycleDay[] => {
  const rawDays = Array.isArray(value) ? value : [];
  const rawByDate = new Map<string, any>();

  rawDays.forEach((raw) => {
    if (raw && typeof raw === "object" && isDateKey((raw as any).dateKey)) {
      rawByDate.set((raw as any).dateKey, raw);
    }
  });

  return dateKeys.map((dateKey, index) => {
    const raw = rawByDate.get(dateKey) || rawDays[index] || {};
    const phase =
      typeof raw?.phase === "string"
        ? raw.phase
        : typeof cycleSnapshot.currentPhase === "string"
          ? cycleSnapshot.currentPhase
          : "";
    const displayPhase = typeof raw?.displayPhase === "string" ? raw.displayPhase : phase;
    const cycleDay = Number.isFinite(Number(raw?.cycleDay)) ? Number(raw.cycleDay) : null;

    return {
      dateKey,
      dayIndex: typeof raw?.dayIndex === "number" ? raw.dayIndex : index + 1,
      phase,
      displayPhase,
      cycleDay,
      isManualPeriod: raw?.isManualPeriod === true,
    };
  });
};

// Welcome Route
app.get("/", (c) => {
  return c.text("Siklusio API Server (Hono + Cloudflare Workers) is running.");
});

app.get("/api/recipes/today", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const date = c.req.query("date");
    if (!isDateKey(date)) {
      return c.json({ error: "Parameter date tidak valid." }, 400);
    }

    const { data: generation, error } = await auth.supabaseAdmin
      .from("recipe_generations")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", date)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;

    if (!generation) {
      return c.json({ generation: null, result: null });
    }

    let result: unknown = generation.result;
    try {
      result = validateRecipesGeneration(generation.result);
    } catch {
      // Keep backward compatibility for older saved payloads.
      result = generation.result;
    }

    return c.json({ generation, result });
  } catch (error: any) {
    console.error("[recipes/today]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil resep hari ini." }, 500);
  }
});

// API Route for generating recipes and groceries (OpenRouter AI)
app.post("/api/generate-recipes", async (c) => {
  console.log("--> [BACKEND] Received request /api/generate-recipes");
  try {
    const body = await c.req.json();
    if (!isDateKey(body?.generatedForDate)) {
      return c.json({ error: "Tanggal resep hari ini tidak valid." }, 400);
    }

    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("<-- [BACKEND] No API key!");
      return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);
    }

    const creditCost = 15;
    const cycleSnapshot = buildRecipeCycleSnapshot(body);

    const { data: existingActive, error: existingError } = await auth.supabaseAdmin
      .from("recipe_generations")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", body.generatedForDate)
      .eq("status", "active")
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingActive) {
      let existingResult: unknown = existingActive.result;
      try {
        existingResult = validateRecipesGeneration(existingActive.result);
      } catch {
        existingResult = existingActive.result;
      }

      return c.json({
        generation: existingActive,
        result: existingResult,
        balance: null,
      });
    }

    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const phase = String(cycleSnapshot.phase || body.phase || "unknown_phase");
    console.log("--> [BACKEND] Phase requested:", phase);

    console.log("--> [BACKEND] Calling OpenRouter API...");
    const modelSelection = resolveOpenRouterModels({
      policy: "paid",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
      paidModel: c.env.OPENROUTER_PAID_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey,
      ...modelSelection,
      messages: [
        {
          role: "user",
          content: `Buat rekomendasi makanan harian untuk fase siklus ${phase}.
Keluaran WAJIB dalam Bahasa Indonesia yang hangat dan praktis.
PENTING:
1. Berikan tepat 2 resep sederhana untuk hari ini.
2. Berikan daftar belanja kecil 3-6 item.
3. Semua bahan harus umum, terjangkau, dan mudah ditemukan di pasar/supermarket Indonesia.
4. Hindari bahan mahal/rare seperti quinoa, asparagus, berries impor, salmon impor.
5. Prioritaskan alternatif lokal seperti telur, tempe, tahu, ikan kembung, ayam, bayam, kangkung, wortel, pisang, pepaya.`,
        },
      ],
      responseSchemaName: "recipes_generation",
      responseSchema: recipesGenerationSchema,
    });

    const result = validateRecipesGeneration(ai.data);

    const { data: savedGeneration, error: saveError } = await auth.supabaseAdmin
      .from("recipe_generations")
      .insert({
        user_id: auth.user.id,
        generated_for_date: body.generatedForDate,
        phase,
        cycle_day: cycleSnapshot.cycleDay,
        days_to_next_period: cycleSnapshot.daysToNextPeriod,
        cycle_snapshot: cycleSnapshot,
        result,
        status: "pending_charge",
        ai_model: ai.model,
        credit_cost: creditCost,
      })
      .select("*")
      .single();

    if (saveError) throw saveError;

    const balanceAfter = await chargeAiCredits({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      amount: creditCost,
      feature: "recipes_today",
      reason: phase,
      referenceId: savedGeneration.id,
      metadata: {
        model: ai.model,
        usage: ai.usage || null,
        generatedForDate: body.generatedForDate,
      },
    });

    const { data: activatedGeneration, error: activateError } = await auth.supabaseAdmin
      .from("recipe_generations")
      .update({ status: "active" })
      .eq("id", savedGeneration.id)
      .select("*")
      .single();

    if (activateError) throw activateError;

    return c.json({
      generation: activatedGeneration || savedGeneration,
      result,
      balance: balanceAfter,
    });
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter recipes error:", error.stack || error);
    return c.json({ error: error instanceof Error ? error.message : "Gagal membuat resep hari ini." }, 500);
  }
});

// API Route for generating AI cycle report (OpenRouter AI)
app.post("/api/generate-cycle-report", async (c) => {
  console.log("--> [BACKEND] Received request /api/generate-cycle-report");
  try {
    const { cycleData, phase, cycleDay, daysToNextPeriod, fertilityWindow, nickname } = await c.req.json();
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
          - User nickname: ${nickname || ''}
          
          Write a warm, supportive, and sweet report IN INDONESIAN, specifically tailored for a woman.
          
          TONE AND PERSONALIZATION RULES (CRITICAL):
          1. Address the user directly using her nickname if provided: "${nickname || ''}".
          2. NEVER use the formal word "Anda".
          3. ALWAYS address her warmly as "kamu" and her nickname.
          4. DO NOT call her "Bunda" in the report text (strictly use "kamu" or her actual nickname).
          5. Keep the tone loving, empathetic, and sweet.`,
        }
      ],
      responseSchemaName: "cycle_report",
      responseSchema: cycleReportSchema,
    });

    console.log("--> [BACKEND] Received OpenRouter response.");
    const result = validateCycleReport(ai.data);
    return c.json(result);
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter API Error / Exception:");
    console.error(error.stack || error);
    return c.json({ error: error instanceof Error ? (error.message || String(error)) : "Gagal membuat laporan" }, 500);
  }
});

// API Route for generating AI habits insight based on 7-day data (OpenRouter AI)
app.post("/api/generate-habits-insight", async (c) => {
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
          - Nama panggilan: ${nickname || ''}
          - Fase siklus saat ini: ${currentPhase}
          - Data 7 hari terakhir: ${JSON.stringify(weeklyData)}

          Berdasarkan data di atas, buatkan analisis dalam Bahasa Indonesia yang:
          1. Ringkas pola aktivitas (berapa persen target tercapai, konsistensi)
          2. Analisis gejala yang muncul (frekuensi, korelasi dengan fase)
          3. Berikan 3 saran spesifik dan praktis untuk minggu depan
          4. Tutup dengan kalimat motivasi yang personal

          PENTING & GAYA BAHASA (SANGAT PENTING):
          - Gunakan bahasa yang hangat, suportif, bersahabat, dan tidak menggurui.
          - Panggil pengguna dengan nama panggilannya jika ada: "${nickname || ''}" atau gunakan kata ganti "kamu".
          - JANGAN PERNAH menggunakan kata formal "Anda".
          - JANGAN PERNAH memanggil pengguna dengan sebutan "Bunda" (selalu gunakan "kamu" atau nama panggilannya).
          - Saran harus realistis dan mudah dilakukan.
          - Jika data kosong/sedikit, tetap berikan saran umum yang relevan dengan fase siklus.`,
        }
      ],
      responseSchemaName: "habits_insight",
      responseSchema: habitsInsightSchema,
    });

    console.log("--> [BACKEND] Received OpenRouter response.");
    const result = validateHabitsInsight(ai.data);
    return c.json(result);
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter API Error / Exception:");
    console.error(error.stack || error);
    return c.json({ error: error instanceof Error ? (error.message || String(error)) : "Gagal membuat insight" }, 500);
  }
});

app.post("/api/generate-calming-reassurance", async (c) => {
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
          content: `Kamu adalah asisten/sahabat kehamilan yang sangat menenangkan dan berempati. Pengguna bernama ${nickname || ''} sedang berada di masa TWW (Two-Week Wait - penantian setelah ovulasi hingga haid berikutnya).
          Masa ini sangat rentan memicu kecemasan (symptom spotting).
          Ini adalah curahan hatinya (jurnal emosi): "${userJournal}"

          Berikan balasan surat yang:
          1. Menvalidasi perasaannya (tidak meremehkan).
          2. Sangat hangat, empatis, bersahabat, dan menyemangati menggunakan kata ganti "kamu" dan nama panggilannya: "${nickname || ''}".
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
        }
      ],
      responseSchemaName: "calming_reassurance",
      responseSchema: calmingReassuranceSchema,
    });

    logInfo("--> [BACKEND] Received OpenRouter response.");
    const result = validateCalmingReassurance(ai.data);
    return c.json(result);
  } catch (error: any) {
    logError("<-- [BACKEND] OpenRouter API Error / Exception:", error.stack || error);
    return c.json({ error: error instanceof Error ? (error.message || String(error)) : "Gagal membuat pesan penenang" }, 500);
  }
});

app.get("/api/ai/credits", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    return c.json({ balance });
  } catch (error: any) {
    console.error("[ai/credits]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil saldo kredit AI." }, 500);
  }
});

app.get("/api/ai/credits/history", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const history = await getAiCreditHistory(auth.supabaseAdmin, auth.user.id);
    return c.json({ history });
  } catch (error: any) {
    console.error("[ai/credits/history]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil riwayat kredit AI." }, 500);
  }
});

// Hono Endpoint for topup AI Credits
app.post("/api/checkout/topup", async (c) => {
  console.log("--> [BACKEND] Received request /api/checkout/topup");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const { packageId, price, credits } = await c.req.json();
    
    if (!packageId || !price || !credits) {
      return c.json({ error: "Data paket topup tidak lengkap." }, 400);
    }

    const mayarKey = c.env.MAYAR_API_KEY;
    if (!mayarKey) {
      return c.json({ error: "Konfigurasi pembayaran belum tersedia." }, 500);
    }

    // Call Mayar API
    const finalAmount = price;
    const { supabaseAdmin, user } = auth;
    
    // Get user details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();
      
    const name = profile?.name || user.email?.split("@")[0] || "User";
    const whatsapp = profile?.whatsapp_number || "-";
    const email = user.email || "";

    console.log("--> Calling Mayar API to create topup link...");
    const response = await fetch("https://api.mayar.id/hl/v1/payment/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mayarKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Top Up Kredit AI Siklusio (${credits} Kredit)`,
        amount: finalAmount,
        description: `Top up saldo kredit AI Siklusio sebanyak ${credits} kredit.`,
        redirectUrl: "https://app.siklusio.web.id/auth?status=topup_success",
        email: email,
        mobile: whatsapp,
        customerName: name,
      })
    });

    const resJson: any = await response.json();
    
    if (!response.ok || resJson.statusCode !== 200) {
      console.error("Mayar API error response:", resJson);
      return c.json({ error: "Gagal membuat tautan pembayaran. Silakan coba lagi." }, 500);
    }

    const paymentUrl = resJson.data?.link;
    const mayarTxId = resJson.data?.id || resJson.data?.transactionId || null;

    // Create ai_credit_topups record
    const { error: insertErr } = await supabaseAdmin
      .from("ai_credit_topups")
      .insert({
        user_id: user.id,
        mayar_link: paymentUrl,
        mayar_transaction_id: mayarTxId,
        amount_rp: finalAmount,
        credits_amount: credits,
        status: "pending",
      });

    if (insertErr) {
      console.error("DB Insert topup error:", insertErr);
      return c.json({ error: "Gagal memproses permintaan topup." }, 500);
    }

    return c.json({ paymentUrl });
  } catch (error: any) {
    console.error("<-- Checkout topup error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server topup." }, 500);
  }
});

app.get("/api/habit-coach/current", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const date = c.req.query("date");
    const hasDateFilter = isDateKey(date);
    if (date && !hasDateFilter) {
      return c.json({ error: "Parameter date tidak valid." }, 400);
    }

    let planQuery = auth.supabaseAdmin
      .from("habit_coach_plans")
      .select("*, habit_coach_plan_days(*)")
      .eq("user_id", auth.user.id)
      .eq("status", "active");

    if (hasDateFilter && date) {
      planQuery = planQuery
        .lte("week_start", date)
        .gte("week_end", date);
    }

    const { data: plan, error } = await planQuery
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return c.json({ plan });
  } catch (error: any) {
    console.error("[habit-coach/current]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil rencana habit." }, 500);
  }
});

app.post("/api/habit-coach/generate", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const body = await c.req.json();
    const dateKeys = Array.isArray(body.dateKeys) ? body.dateKeys : [];
    if (
      !isValidHabitCoachWindow({
        weekStart: body.weekStart,
        weekEnd: body.weekEnd,
        dateKeys,
      })
    ) {
      return c.json({ error: "Data minggu habit tidak valid." }, 400);
    }

    const mode = body.mode === "renewal" ? "renewal" : "initial";
    const creditCost = mode === "renewal" ? 60 : 50;
    const replaceActivePlan = shouldReplaceActivePlan(body.replaceActivePlan);

    const { data: overlappingActivePlans, error: existingError } = await auth.supabaseAdmin
      .from("habit_coach_plans")
      .select("id, week_start, week_end")
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .lte("week_start", body.weekEnd)
      .gte("week_end", body.weekStart)
      .order("week_end", { ascending: false });

    if (existingError) throw existingError;
    const activeOverlaps = Array.isArray(overlappingActivePlans) ? overlappingActivePlans : [];
    const overlapConflict = buildHabitCoachActiveOverlapConflict({
      activeOverlaps,
      replaceActivePlan,
      fallbackWeekEnd: body.weekEnd,
    });
    if (overlapConflict) {
      return c.json(overlapConflict, 409);
    }

    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const answers = Array.isArray(body.answers)
      ? body.answers.map((answer: any) => ({
          question: String(answer?.question || ""),
          answer: String(answer?.answer || ""),
        }))
      : [];
    const cycleSnapshot = body.cycleSnapshot || {};
    const cycleDays = normalizeHabitCoachCycleDays(body.cycleDays, dateKeys, cycleSnapshot);
    const previousSummary = {
      ...(body.previousSummary || {}),
      activity: summarizeActivityHistory(body.activityHistory || {}),
    };

    const modelSelection = resolveOpenRouterModels({
      policy: "paid",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
      paidModel: c.env.OPENROUTER_PAID_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey: c.env.OPENROUTER_API_KEY,
      ...modelSelection,
      messages: buildHabitCoachMessages({
        nickname: body.nickname || "",
        mode,
        answers,
        cycleSnapshot,
        cycleDays,
        previousSummary,
      }),
      responseSchemaName: "habit_coach_plan",
      responseSchema: habitCoachPlanSchema,
      maxCompletionTokens: 2200,
    });

    const result = validateHabitCoachPlan(ai.data);

    const { plan, balance: balanceAfter } = await saveHabitCoachPlanWithCharge({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      replaceActivePlan,
      activeOverlaps,
      dateKeys,
      cycleDays,
      aiDays: result.days,
      planInsert: {
        user_id: auth.user.id,
        week_start: body.weekStart,
        week_end: body.weekEnd,
        mode,
        status: "pending_charge",
        user_goal: body.userGoal || "habit sehat",
        user_constraints: { answers },
        cycle_snapshot: cycleSnapshot,
        previous_summary: previousSummary,
        coach_summary: result.coachSummary,
        ai_model: ai.model,
        credit_cost: creditCost,
      },
      charge: (referenceId) =>
        chargeAiCredits({
          supabaseAdmin: auth.supabaseAdmin,
          userId: auth.user.id,
          amount: creditCost,
          feature: "habit_coach",
          reason: mode,
          referenceId,
          metadata: { model: ai.model, usage: ai.usage || null },
        }),
    });

    return c.json({
      plan,
      balance: balanceAfter,
    });
  } catch (error: any) {
    console.error("[habit-coach/generate]", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat rencana habit." }, 500);
  }
});

app.post("/api/cycle-guide/generate", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const body = await c.req.json();
    if (typeof body.generatedForDate !== "string") {
      return c.json({ error: "Tanggal panduan siklus tidak valid." }, 400);
    }

    const guideLevel =
      body.guideLevel === "active" || body.guideLevel === "personal"
        ? body.guideLevel
        : "starter";
    const creditCost = 40;

    const { data: existingActive, error: existingError } = await auth.supabaseAdmin
      .from("cycle_guides")
      .select("id, result")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", body.generatedForDate)
      .eq("status", "active")
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingActive) {
      return c.json({
        error: "Panduan siklus untuk hari ini sudah dibuat.",
        guideId: existingActive.id,
        result: existingActive.result,
      }, 409);
    }

    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const cycleSnapshot = buildCycleGuideSnapshot({ ...body, guideLevel });
    const habitSnapshot = body.habitSnapshot || {};

    const modelSelection = resolveOpenRouterModels({
      policy: "paid",
      freeModel: c.env.OPENROUTER_FREE_MODEL,
      paidModel: c.env.OPENROUTER_PAID_MODEL,
    });
    const ai = await callOpenRouterJson<any>({
      apiKey: c.env.OPENROUTER_API_KEY,
      ...modelSelection,
      messages: buildCycleGuideMessages({
        nickname: body.nickname || "",
        guideLevel,
        cycleSnapshot,
        habitSnapshot,
      }),
      responseSchemaName: "cycle_guide",
      responseSchema: cycleGuideSchema,
      maxCompletionTokens: 1200,
    });

    const result = validateCycleGuide(ai.data);

    const { data: saved, error: saveError } = await auth.supabaseAdmin
      .from("cycle_guides")
      .insert({
        user_id: auth.user.id,
        generated_for_date: body.generatedForDate,
        guide_level: guideLevel,
        cycle_snapshot: cycleSnapshot,
        habit_snapshot: habitSnapshot,
        result,
        status: "pending_charge",
        ai_model: ai.model,
        credit_cost: creditCost,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    const balanceAfter = await chargeAiCredits({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      amount: creditCost,
      feature: "cycle_guide",
      reason: guideLevel,
      referenceId: saved.id,
      metadata: { model: ai.model, usage: ai.usage || null },
    });

    const { data: activatedGuide, error: activateError } = await auth.supabaseAdmin
      .from("cycle_guides")
      .update({ status: "active" })
      .eq("id", saved.id)
      .select()
      .single();

    if (activateError) throw activateError;

    return c.json({ guide: activatedGuide, result, balance: balanceAfter });
  } catch (error: any) {
    console.error("[cycle-guide/generate]", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat panduan siklus." }, 500);
  }
});

app.get("/api/cycle-guide/today", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const date = c.req.query("date");
    if (!date) {
      return c.json({ error: "Parameter date diperlukan." }, 400);
    }

    const { data: guide, error } = await auth.supabaseAdmin
      .from("cycle_guides")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", date)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return c.json({ guide });
  } catch (error: any) {
    console.error("[cycle-guide/today]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil panduan siklus." }, 500);
  }
});

// API Route for Admin to fetch all profiles
app.get("/api/admin/users", async (c) => {
  console.log("--> [BACKEND] Received request /api/admin/users");
  try {
    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }
    const { supabaseAdmin, user } = auth;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return c.json({ error: profileErr.message }, 500);
    }

    if (!profile?.is_admin) {
      return c.json({ error: "Forbidden: admin access required" }, 403);
    }

    const authUsers = await listAllAuthUsers(supabaseAdmin);
    const authUsersById = new Map(authUsers.map((authUser: any) => [authUser.id, authUser]));

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (profileError) throw profileError;

    // Merge database profiles and Auth emails
    const usersData = profiles.map(p => {
      const authUser = authUsersById.get(p.id);
      return {
        ...p,
        email: authUser?.email,
        last_sign_in_at: authUser?.last_sign_in_at
      };
    });

    return c.json({ users: usersData });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: error.message || "Failed to fetch users" }, 500);
  }
});

// API Route for Avatar Upload to Cloudflare R2
app.post("/api/upload-avatar", async (c) => {
  console.log("--> [BACKEND] Received request /api/upload-avatar");
  try {
    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    const { base64 } = await c.req.json();
    if (!base64 || typeof base64 !== "string") {
      return c.json({ error: "Missing or invalid 'base64' field" }, 400);
    }

    // Validate size (base64 is ~33% larger than raw bytes)
    const estimatedBytes = Math.ceil(base64.length * 0.75);
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (estimatedBytes > MAX_BYTES) {
      return c.json({ error: "Ukuran gambar maksimal 5 MB" }, 400);
    }

    const buffer = Buffer.from(base64, "base64");
    const avatarImage = detectAvatarImage(buffer);
    if (!avatarImage) {
      return c.json({ error: "Format avatar tidak didukung. Gunakan WebP, PNG, atau JPEG." }, 400);
    }

    const bucketName = c.env.R2_BUCKET_NAME || "siklusio-avatars";
    const publicUrl = (c.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    if (!publicUrl) {
      return c.json({ error: "R2_PUBLIC_URL is not configured" }, 500);
    }

    const key = `avatars/${auth.user.id}/${Date.now()}.${avatarImage.extension}`;

    // Setup R2 client using env variables from context c.env
    const accountId = c.env.R2_ACCOUNT_ID;
    const accessKeyId = c.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return c.json({ error: "Missing R2 configuration (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)" }, 500);
    }

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: avatarImage.contentType,
      })
    );

    const url = `${publicUrl}/${key}`;
    console.log("<-- [BACKEND] Avatar uploaded successfully", { contentType: avatarImage.contentType });
    return c.json({ url });
  } catch (error: any) {
    console.error("<-- [BACKEND] Avatar upload error:", error.stack || error);
    return c.json({
      error: error instanceof Error ? error.message : "Gagal mengunggah avatar",
    }, 500);
  }
});

// API Route for Admin to manage coupons
app.get("/api/admin/coupons", async (c) => {
  console.log("--> [BACKEND] Received request GET /api/admin/coupons");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);
    
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden: admin access required" }, 403);

    const { data: coupons, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    
    return c.json({ coupons });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/api/admin/coupons", async (c) => {
  console.log("--> [BACKEND] Received request POST /api/admin/coupons");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing session" }, 401);
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden" }, 403);

    const { code, discount_type, discount_value, is_active } = await c.req.json();
    if (!code || !discount_type || !discount_value) {
      return c.json({ error: "Input tidak valid" }, 400);
    }

    const { data, error } = await supabaseAdmin.from("coupons").insert({
      code: code.trim(),
      discount_type,
      discount_value: Number(discount_value),
      is_active: is_active ?? true
    }).select().single();

    if (error) throw error;
    return c.json({ coupon: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.patch("/api/admin/coupons/:id", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing session" }, 401);
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { is_active } = await c.req.json();
    
    const { error } = await supabaseAdmin.from("coupons").update({ is_active }).eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/api/admin/coupons/:id", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing session" }, 401);
    const { supabaseAdmin, user } = auth;
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================
// Affiliate Public Endpoint — validate referral code [FIX-3]
// ============================================================
app.get("/api/affiliate/validate", async (c) => {
  console.log("--> [BACKEND] GET /api/affiliate/validate");
  try {
    const code = (c.req.query("code") || "").trim().toUpperCase();
    if (!code) return c.json({ valid: false });

    const supabaseAdmin = getSupabaseAdmin(c);
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("code, commission_type, commission_value")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!affiliate) return c.json({ valid: false });

    // Check if matching coupon exists for discount label
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("discount_type, discount_value")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    let discountLabel = "";
    if (coupon) {
      discountLabel = coupon.discount_type === "percentage"
        ? `Diskon ${coupon.discount_value}%`
        : `Diskon Rp ${Number(coupon.discount_value).toLocaleString("id-ID")}`;
    }

    return c.json({ valid: true, discountLabel });
  } catch (error: any) {
    console.error("Affiliate validate error:", error);
    return c.json({ valid: false });
  }
});

// ============================================================
// Affiliate User Endpoints (Self-Serve)
// ============================================================

// GET /api/affiliate/me — Get affiliate profile for logged-in user
app.get("/api/affiliate/me", async (c) => {
  console.log("--> [BACKEND] GET /api/affiliate/me");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    
    // Find affiliate by user email
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    return c.json({ affiliate: affiliate || null });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/affiliate/register — Self-register as affiliate
app.post("/api/affiliate/register", async (c) => {
  console.log("--> [BACKEND] POST /api/affiliate/register");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    const { code, bank_name, account_number, account_holder } = await c.req.json();

    if (!code) {
      return c.json({ error: "Kode referal wajib diisi" }, 400);
    }
    const safeCode = code.trim().toUpperCase().replace(/\s/g, '');

    // Get user profile details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.name || user.email?.split("@")[0] || "User";
    const whatsapp = profile?.whatsapp_number || "-";

    // Use transactional RPC to also create coupon 10%
    const { data, error } = await supabaseAdmin.rpc("create_affiliate_with_coupon", {
      p_name: name,
      p_email: user.email,
      p_whatsapp: whatsapp,
      p_code: safeCode,
      p_commission_type: "percentage",
      p_commission_value: 40, // 40% default user commission
      p_bank_name: bank_name || null,
      p_account_number: account_number || null,
      p_account_holder: account_holder || null,
      p_auto_coupon: false, // disabled 10% discount auto coupon
      p_coupon_discount_type: "percentage",
      p_coupon_discount_value: 0, // no default coupon discount for buyer
    });

    if (error) {
      if (error.code === '23505') return c.json({ error: "Kode referal sudah digunakan, pilih kode lain." }, 400);
      throw error;
    }

    return c.json({ affiliate: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/affiliate/me/conversions — List user's conversions
app.get("/api/affiliate/me/conversions", async (c) => {
  console.log("--> [BACKEND] GET /api/affiliate/me/conversions");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    
    // Find affiliate ID first
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!affiliate) {
      return c.json({ conversions: [] });
    }

    const { data: conversions, error } = await supabaseAdmin
      .from("affiliate_conversions")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return c.json({ conversions: conversions || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/affiliate/me/bank — Update user's bank info
app.patch("/api/affiliate/me/bank", async (c) => {
  console.log("--> [BACKEND] PATCH /api/affiliate/me/bank");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin, user } = auth;
    const { bank_name, account_number, account_holder } = await c.req.json();

    const { error } = await supabaseAdmin
      .from("affiliates")
      .update({
        bank_name,
        account_number,
        account_holder
      })
      .eq("email", user.email);

    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================
// Affiliate Admin Endpoints
// ============================================================

// GET /api/admin/affiliates — List all affiliates
app.get("/api/admin/affiliates", async (c) => {
  console.log("--> [BACKEND] GET /api/admin/affiliates");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const { data, error } = await admin.supabaseAdmin
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ affiliates: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/affiliates — Create affiliate (via RPC for transactional coupon) [FIX-6]
app.post("/api/admin/affiliates", async (c) => {
  console.log("--> [BACKEND] POST /api/admin/affiliates");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const body = await c.req.json();
    const { name, email, whatsapp, code, commission_type, commission_value,
            bank_name, account_number, account_holder,
            autoCreateCoupon, coupon_discount_type, coupon_discount_value } = body;

    if (!name || !email || !whatsapp || !code || !commission_type || commission_value == null) {
      return c.json({ error: "Data afiliasi tidak lengkap" }, 400);
    }

    if (autoCreateCoupon) {
      // Use transactional RPC [FIX-6]
      const { data, error } = await admin.supabaseAdmin.rpc("create_affiliate_with_coupon", {
        p_name: name,
        p_email: email,
        p_whatsapp: whatsapp,
        p_code: code,
        p_commission_type: commission_type,
        p_commission_value: Number(commission_value),
        p_bank_name: bank_name || null,
        p_account_number: account_number || null,
        p_account_holder: account_holder || null,
        p_auto_coupon: true,
        p_coupon_discount_type: coupon_discount_type || "percentage",
        p_coupon_discount_value: Number(coupon_discount_value || 10),
      });
      if (error) throw error;
      return c.json({ result: data });
    } else {
      // Direct insert without coupon
      const { data, error } = await admin.supabaseAdmin
        .from("affiliates")
        .insert({
          name,
          email,
          whatsapp,
          code: code.trim().toUpperCase(),
          commission_type,
          commission_value: Number(commission_value),
          bank_name: bank_name || null,
          account_number: account_number || null,
          account_holder: account_holder || null,
        })
        .select()
        .single();
      if (error) throw error;
      return c.json({ affiliate: data });
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/admin/affiliates/:id — Update affiliate
app.patch("/api/admin/affiliates/:id", async (c) => {
  console.log("--> [BACKEND] PATCH /api/admin/affiliates/:id");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const updates = await c.req.json();

    // Only allow safe fields to be updated
    const allowedFields = ["name", "email", "whatsapp", "commission_type", "commission_value",
      "bank_name", "account_number", "account_holder", "is_active", "allow_zero_order_commission"];
    const safeUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const { error } = await admin.supabaseAdmin
      .from("affiliates")
      .update(safeUpdates)
      .eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/admin/affiliates/:id — Delete affiliate
app.delete("/api/admin/affiliates/:id", async (c) => {
  console.log("--> [BACKEND] DELETE /api/admin/affiliates/:id");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { error } = await admin.supabaseAdmin
      .from("affiliates")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/admin/affiliates/conversions — List all conversions
app.get("/api/admin/affiliates/conversions", async (c) => {
  console.log("--> [BACKEND] GET /api/admin/affiliates/conversions");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const { data, error } = await admin.supabaseAdmin
      .from("affiliate_conversions")
      .select("*, affiliates(name, code, email, whatsapp, bank_name, account_number, account_holder)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ conversions: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/admin/affiliates/conversions/:id/payout — Mark conversion as paid [FIX-4]
app.patch("/api/admin/affiliates/conversions/:id/payout", async (c) => {
  console.log("--> [BACKEND] PATCH /api/admin/affiliates/conversions/:id/payout");
  try {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    const { payout_reference, payout_note } = await c.req.json();

    const { error } = await admin.supabaseAdmin
      .from("affiliate_conversions")
      .update({
        payout_status: "paid",
        payout_at: new Date().toISOString(),
        payout_marked_by: admin.user.email || admin.user.id,
        payout_reference: payout_reference || null,
        payout_note: payout_note || null,
      })
      .eq("id", id);
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================
// Checkout & Payment
// ============================================================

// Hono Endpoint for pre-checkout registration + Mayar dynamic payment
app.post("/api/checkout/register", async (c) => {
  logInfo("--> [BACKEND] Received request /api/checkout/register");
  try {
    const { name, email, whatsapp, password, couponCode, affiliateCode } = await c.req.json();
    
    if (!name || !email || !whatsapp || !password) {
      return c.json({ error: "Semua formulir pendaftaran wajib diisi." }, 400);
    }

    // Validate Mayar API key is configured
    const mayarKey = c.env.MAYAR_API_KEY;
    if (!mayarKey) {
      logError("MAYAR_API_KEY secret is not configured");
      return c.json({ error: "Konfigurasi pembayaran belum tersedia. Hubungi admin." }, 500);
    }

    const supabaseAdmin = getSupabaseAdmin(c);

    // Check if email already registered in Supabase
    logInfo("--> Checking existing auth users...");
    const { data: authUserList, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) {
      logError("Error listing users:", authErr);
    }
    const emailExists = authUserList?.users.some(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return c.json({ error: "Email ini sudah terdaftar. Silakan login langsung di aplikasi." }, 400);
    }

    // Determine final price based on coupon
    let finalAmount = 37000;
    
    if (couponCode) {
      const normalizedCode = couponCode.trim().toUpperCase();
      logInfo(`--> Validating coupon: ${normalizedCode}`);
      const { data: coupon, error: couponErr } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (couponErr) {
        logError("Error fetching coupon:", couponErr);
        return c.json({ error: "Terjadi kesalahan saat memvalidasi kupon. Silakan coba lagi." }, 500);
      }
      
      if (coupon) {
        if (coupon.discount_type === 'nominal') {
          finalAmount = Math.max(0, finalAmount - Number(coupon.discount_value));
        } else if (coupon.discount_type === 'percentage') {
          const discount = Math.floor(finalAmount * (Number(coupon.discount_value) / 100));
          finalAmount = Math.max(0, finalAmount - discount);
        }
        logInfo(`--> Coupon applied. New amount: ${finalAmount}`);
      } else {
        return c.json({ error: "Kode kupon tidak valid atau sudah tidak aktif." }, 400);
      }
    }
    
    // Safety check: Mayar minimum is 10k, unless it's completely free
    if (finalAmount > 0 && finalAmount < 10000) {
      finalAmount = 10000;
    }

    // If Free / 100% discount, bypass Mayar and create user directly
    // Resolve affiliate code if provided
    const normalizedAffiliateCode = affiliateCode ? affiliateCode.trim().toUpperCase() : null;
    let validatedAffiliateCode: string | null = null;
    if (normalizedAffiliateCode) {
      const { data: aff } = await supabaseAdmin
        .from("affiliates")
        .select("code")
        .eq("code", normalizedAffiliateCode)
        .eq("is_active", true)
        .maybeSingle();
      if (aff) validatedAffiliateCode = aff.code;
      logInfo(`--> Affiliate code '${normalizedAffiliateCode}' validated: ${!!aff}`);
    }

    if (finalAmount === 0) {
      logInfo("--> 100% Free Coupon applied! Bypassing Mayar...");
      
      // Create user directly
      const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name,
          whatsapp: whatsapp,
        },
        app_metadata: {
          siklusio_access_status: "active",
        }
      });

      if (signupErr) {
        logError("Supabase auth user creation error:", signupErr);
        return c.json({ error: "Gagal membuat akun: " + signupErr.message }, 500);
      }

      // Create checkout_session for free bypass [FIX-2]
      const { data: session } = await supabaseAdmin
        .from("checkout_sessions")
        .insert({
          email: email.toLowerCase(),
          name,
          whatsapp,
          coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
          affiliate_code: validatedAffiliateCode,
          final_amount: 0,
          status: "free_bypass",
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Record affiliate conversion for free orders [FIX-5]
      if (validatedAffiliateCode && session) {
        const { data: aff } = await supabaseAdmin
          .from("affiliates")
          .select("id, commission_type, commission_value, allow_zero_order_commission")
          .eq("code", validatedAffiliateCode)
          .maybeSingle();

        if (aff) {
          // [FIX-5] Default: no commission for free orders unless explicitly allowed
          let commissionAmount = 0;
          if (aff.allow_zero_order_commission) {
            commissionAmount = aff.commission_type === "nominal"
              ? Number(aff.commission_value)
              : 0; // percentage of 0 is always 0
          }

          await supabaseAdmin.from("affiliate_conversions").insert({
            affiliate_id: aff.id,
            checkout_session_id: session.id,
            buyer_name: name,
            buyer_email: email.toLowerCase(),
            buyer_whatsapp: whatsapp,
            amount_paid: 0,
            commission_amount: commissionAmount,
            mayar_transaction_id: null, // free bypass has no Mayar tx
          });
          logInfo(`--> Affiliate conversion recorded (free bypass, commission: ${commissionAmount})`);
        }
      }

      if (authData.user?.id) {
        await grantPremiumInitialAiCredits({
          supabaseAdmin,
          userId: authData.user.id,
          referenceId: session?.id || null,
        });
      }
      
      logInfo("<-- Free Checkout successful! User ID:", authData.user?.id);
      return c.json({ paymentUrl: "https://app.siklusio.web.id/auth?status=success_free" });
    }

    // Create the Supabase Auth user immediately in auth, but mark with app_metadata
    logInfo("--> Creating Supabase Auth user immediately as pending...");
    const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        whatsapp: whatsapp,
      },
      app_metadata: {
        siklusio_access_status: "pending_payment",
      }
    });

    if (signupErr) {
      logError("Supabase auth user creation error:", signupErr);
      return c.json({ error: "Gagal membuat akun: " + signupErr.message }, 500);
    }

    const userId = authData.user.id;

    // Normal paid flow: Save pending registration & call Mayar (without plaintext password)
    logInfo("--> Inserting pending registration...");
    const { error: insertErr } = await supabaseAdmin
      .from("pending_registrations")
      .upsert({
        email: email.toLowerCase(),
        user_id: userId,
        name,
        whatsapp,
        coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
        affiliate_code: validatedAffiliateCode,
      }, { onConflict: "email" });

    if (insertErr) {
      logError("DB Insert pending registration error:", insertErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return c.json({ error: "Gagal menyimpan pendaftaran tertunda. Silakan coba kembali." }, 500);
    }

    // Create dynamic payment via Mayar API
    logInfo("--> Calling Mayar API to create payment link...");
    let paymentUrl = "";
    let mayarTxId = "";
    try {
      const response = await fetch("https://api.mayar.id/hl/v1/payment/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mayarKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Siklusio Premium — Akses Selamanya",
          amount: finalAmount,
          description: "Investasi satu kali untuk akses selamanya: Pelacak Ovulasi Medis, Asisten AI 24/7, Komunitas Aman, dan Jembatan Rasa Suami.",
          redirectUrl: "https://app.siklusio.web.id/auth?status=success",
          email: email.toLowerCase(),
          mobile: whatsapp,
          customerName: name,
        })
      });

      const resJson: any = await response.json();
      if (!response.ok || resJson.statusCode !== 200) {
        throw new Error(resJson.message || "Gagal membuat link pembayaran Mayar");
      }

      paymentUrl = resJson.data?.link;
      mayarTxId = resJson.data?.id || resJson.data?.transactionId || null;
    } catch (payErr: any) {
      logError("Mayar API error:", payErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("pending_registrations").delete().eq("email", email.toLowerCase());
      return c.json({ error: "Gagal membuat link pembayaran. Hubungi admin." }, 500);
    }

    // Create checkout_session for paid flow [FIX-2]
    const { error: sessionErr } = await supabaseAdmin
      .from("checkout_sessions")
      .insert({
        email: email.toLowerCase(),
        name,
        whatsapp,
        coupon_code: couponCode ? couponCode.trim().toUpperCase() : null,
        affiliate_code: validatedAffiliateCode,
        final_amount: finalAmount,
        mayar_link: paymentUrl,
        mayar_transaction_id: mayarTxId,
        status: "pending",
      });

    if (sessionErr) {
      logError("DB Insert checkout_session error:", sessionErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("pending_registrations").delete().eq("email", email.toLowerCase());
      return c.json({ error: "Gagal mencatat sesi pembayaran. Silakan coba kembali." }, 500);
    }

    logInfo("<-- Checkout request successful! Payment URL:", paymentUrl);
    return c.json({ paymentUrl });
  } catch (error: any) {
    logError("<-- Checkout register error:", error.stack || error);
    return c.json({ error: "Terjadi kesalahan internal pada server pendaftaran." }, 500);
  }
});

app.post("/api/payment/webhook", async (c) => {
  logInfo("--> [BACKEND] Received Mayar webhook notification");
  try {
    // Verify webhook token from Mayar (X-Callback-Token header)
    const expectedToken = c.env.MAYAR_WEBHOOK_TOKEN || "";
    if (!expectedToken) {
      logError("--> Webhook rejected: Webhook secret is not configured");
      return c.json({ error: "Webhook secret is not configured" }, 500);
    }

    const callbackToken = c.req.header("x-callback-token") || c.req.header("X-Callback-Token") || "";
    if (callbackToken !== expectedToken) {
      logWarn("--> Webhook rejected: invalid or missing X-Callback-Token");
      return c.json({ error: "Unauthorized webhook request" }, 401);
    }

    // Safely parse body — Mayar test pings may send empty or non-JSON body
    let body: any = {};
    try {
      const rawText = await c.req.text();
      logInfo("--> Webhook raw body:", rawText.slice(0, 500));
      if (rawText && rawText.trim()) {
        body = JSON.parse(rawText);
      }
    } catch (parseErr) {
      logWarn("--> Webhook body is not valid JSON, treating as test ping");
      return c.json({ status: "ok", message: "Webhook endpoint is active" }, 200);
    }

    // Handle Mayar test/ping webhook (empty body or no event data)
    const event = body.event || body.type || "";
    logInfo("--> Webhook event type:", event);
    logInfo("--> Webhook body:", JSON.stringify(body).slice(0, 1000));

    // For test pings or non-purchase events, acknowledge immediately
    if (!body.data && !body.email && !body.customer) {
      logInfo("--> Webhook acknowledged (test/ping or no customer data)");
      return c.json({ status: "ok", message: "Webhook received successfully" }, 200);
    }

    // Extract email from multiple possible payload locations (Mayar sends different formats)
    const email = 
      body.data?.customerEmail ||
      body.data?.email ||
      body.data?.customer?.email ||
      body.email ||
      body.customer?.email ||
      body.data?.transactions?.[0]?.email ||
      "";

    if (!email) {
      logWarn("--> Webhook ignored: No email found in payload");
      return c.json({ status: "ok", message: "Webhook received but no email found" }, 200);
    }

    // Extract Mayar transaction ID for idempotency [FIX-1]
    const mayarTransactionId =
      body.data?.id ||
      body.data?.transactionId ||
      body.data?.transaction_id ||
      body.id ||
      null;

    // Only process purchase/payment success events for account creation
    // Skip reminders, tracking, and other non-payment events
    const isPurchaseEvent = 
      event === "payment.success" ||
      event === "payment" ||
      event === "purchase" ||
      body.data?.status === "paid" ||
      body.data?.status === "PAID" ||
      body.data?.isPaid === true ||
      body.data?.statusCode === 200;

    if (!isPurchaseEvent && event) {
      logInfo(`--> Webhook skipped: event '${event}' is not a purchase event`);
      return c.json({ status: "ok", message: `Event '${event}' acknowledged, no action needed` }, 200);
    }

    const supabaseAdmin = getSupabaseAdmin(c);

    // [FIX-1] Idempotency & Top-Up check:
    if (mayarTransactionId) {
      // 1. Check if it is a top-up transaction
      const { data: topup, error: topupErr } = await supabaseAdmin
        .from("ai_credit_topups")
        .select("*")
        .eq("mayar_transaction_id", mayarTransactionId)
        .maybeSingle();

      if (topupErr) {
        logError("Database query topup error:", topupErr);
      }

      if (topup) {
        if (topup.status === "paid") {
          logInfo(`--> Webhook idempotency: topup ${mayarTransactionId} already processed, skipping`);
          return c.json({ status: "ok", message: "Topup already processed" }, 200);
        }

        logInfo(`--> Processing successful topup via atomic RPC for user: ${topup.user_id}, credits: ${topup.credits_amount}`);
        
        // Atomically process top-up (Phase 8 RPC)
        const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc("process_paid_ai_credit_topup", {
          p_mayar_transaction_id: mayarTransactionId,
        });

        if (rpcErr) {
          logError("Error processing topup atomically:", rpcErr);
          return c.json({ error: "Failed to process topup atomically" }, 500);
        }

        const balanceAfter = rpcResult?.balance || 0;

        logInfo(`<-- Topup processed successfully! New balance: ${balanceAfter}`);
        return c.json({ status: "ok", message: "Topup successful", balance: balanceAfter }, 200);
      }

      // 2. Check if this transaction was already processed as an affiliate conversion
      const { data: existingConversion } = await supabaseAdmin
        .from("affiliate_conversions")
        .select("id")
        .eq("mayar_transaction_id", mayarTransactionId)
        .maybeSingle();

      if (existingConversion) {
        logInfo(`--> Webhook idempotency: transaction ${mayarTransactionId} already processed, skipping`);
        return c.json({ status: "ok", message: "Transaction already processed" }, 200);
      }
    }

    // Fetch the pending registration details
    logInfo("--> Querying pending registration for email:", email);
    const { data: pending, error: pendingErr } = await supabaseAdmin
      .from("pending_registrations")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (pendingErr) {
      logError("Database query pending registration error:", pendingErr);
      return c.json({ error: "Database error querying pending registrations" }, 500);
    }

    if (!pending) {
      logInfo("--> Webhook skipped: No pending registration found for email:", email);
      return c.json({ status: "ok", message: "No pending registration found" }, 200);
    }

    // Activate existing pending auth user instead of creating one from a password [FIX-1]
    logInfo("--> Activating existing pending Supabase Auth user:", pending.user_id);
    const { data: authData, error: signupErr } = await supabaseAdmin.auth.admin.updateUserById(
      pending.user_id,
      {
        app_metadata: {
          siklusio_access_status: "active",
        },
      }
    );

    if (signupErr) {
      logError("Supabase auth user activation error:", signupErr);
      return c.json({ error: "Auth user activation failed: " + signupErr.message }, 500);
    }

    const { data: premiumSession } = await supabaseAdmin
      .from("checkout_sessions")
      .select("id")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (authData.user?.id) {
      await grantPremiumInitialAiCredits({
        supabaseAdmin,
        userId: authData.user.id,
        referenceId: premiumSession?.id || null,
      });
    }

    // [FIX-2] Process affiliate conversion from checkout_session
    const affiliateCode = pending.affiliate_code;
    if (affiliateCode) {
      logInfo(`--> Processing affiliate conversion for code: ${affiliateCode}`);
      
      // Find the matching checkout session [FIX-2]
      const { data: session } = await supabaseAdmin
        .from("checkout_sessions")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("affiliate_code", affiliateCode)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Look up affiliate details
      const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, commission_type, commission_value, allow_zero_order_commission")
        .eq("code", affiliateCode)
        .eq("is_active", true)
        .maybeSingle();

      if (affiliate) {
        const amountPaid = session?.final_amount || body.data?.amount || 0;
        
        // Calculate commission
        let commissionAmount = 0;
        if (Number(amountPaid) === 0 && !affiliate.allow_zero_order_commission) {
          // [FIX-5] No commission for free orders by default
          commissionAmount = 0;
        } else if (affiliate.commission_type === "percentage") {
          commissionAmount = Math.floor(Number(amountPaid) * (Number(affiliate.commission_value) / 100));
        } else {
          commissionAmount = Number(affiliate.commission_value);
        }

        // Insert conversion with idempotency key [FIX-1]
        const { error: convErr } = await supabaseAdmin
          .from("affiliate_conversions")
          .insert({
            affiliate_id: affiliate.id,
            checkout_session_id: session?.id || null,
            buyer_name: pending.name,
            buyer_email: pending.email,
            buyer_whatsapp: pending.whatsapp,
            amount_paid: Number(amountPaid),
            commission_amount: commissionAmount,
            mayar_transaction_id: mayarTransactionId,
          });

        if (convErr) {
          // If unique constraint violation on mayar_transaction_id, it's a retry — safe to ignore
          if (convErr.code === "23505") {
            logInfo(`--> Affiliate conversion already exists for tx ${mayarTransactionId} (idempotent)`);
          } else {
            logError("Error inserting affiliate conversion:", convErr);
          }
        } else {
          logInfo(`--> Affiliate conversion recorded: commission Rp ${commissionAmount}`);
        }
      }

      // Update checkout_session status to paid
      if (session) {
        await supabaseAdmin
          .from("checkout_sessions")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", session.id);
      }
    }

    // Delete the pending registration record (cleanup)
    logInfo("--> Deleting pending registration record for email:", email);
    await supabaseAdmin
      .from("pending_registrations")
      .delete()
      .eq("id", pending.id);

    logInfo("<-- Webhook processed successfully! User created ID:", authData.user?.id);
    return c.json({ status: "ok", message: "Registration successful!", userId: authData.user?.id });
  } catch (error: any) {
    logError("<-- Webhook handler exception:", error.stack || error);
    return c.json({ error: "Internal server error processing webhook" }, 500);
  }
});

// Also support GET for webhook URL verification (some payment providers ping with GET first)
app.get("/api/payment/webhook", (c) => {
  console.log("--> [BACKEND] Webhook URL verification (GET)");
  return c.json({ status: "ok", message: "Webhook endpoint is active" }, 200);
});

// Fallback Route
app.notFound((c) => {
  return c.json({ error: "API Route Not Found" }, 404);
});

export default app;
