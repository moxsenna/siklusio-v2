import { Hono } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middleware/auth";
import { isDateKey } from "../ai/habitCoachWindow";
import { validateRecipesGeneration, recipesGenerationSchema } from "../schemas/requestSchemas";
import { buildRecipeCycleSnapshot } from "../ai/recipeSummary";
import { getAiCreditBalance, chargeAiCredits } from "../services/aiCreditLedger";
import { resolveOpenRouterModels } from "../ai/modelPolicy";
import { callOpenRouterJson } from "../ai/openRouter";

const router = new Hono<{ Bindings: Env }>();

router.get("/api/recipes/today", async (c) => {
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

router.post("/api/generate-recipes", async (c) => {
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

export default router;
