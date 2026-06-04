import { Hono } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middleware/auth";
import { getAiCreditBalance, chargeAiCredits } from "../services/aiCreditLedger";
import { buildCycleGuideSnapshot } from "../ai/cycleGuideSummary";
import { resolveOpenRouterModels } from "../ai/modelPolicy";
import { callOpenRouterJson } from "../ai/openRouter";
import { buildCycleGuideMessages } from "../ai/prompts";
import { validateCycleGuide, cycleGuideSchema } from "../schemas/requestSchemas";
import { aiSafetyEnvelope } from "../ai/safety";

const router = new Hono<{ Bindings: Env }>();

router.post("/api/cycle-guide/generate", async (c) => {
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
        result: aiSafetyEnvelope(existingActive.result as any),
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

    const result = aiSafetyEnvelope(validateCycleGuide(ai.data));

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

router.get("/api/cycle-guide/today", async (c) => {
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
    if (guide && guide.result) {
      guide.result = aiSafetyEnvelope(guide.result);
    }
    return c.json({ guide });
  } catch (error: any) {
    console.error("[cycle-guide/today]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil panduan siklus." }, 500);
  }
});

export default router;
