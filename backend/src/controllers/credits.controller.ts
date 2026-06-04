import { Context } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middlewares/auth";
import { getAiCreditBalance, getAiCreditHistory } from "../services/aiCreditLedger";

// GET /api/ai/credits
export const getCreditsBalance = async (c: Context<{ Bindings: Env }>) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    return c.json({ balance });
  } catch (error: any) {
    console.error("[ai/credits]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil saldo kredit AI." }, 500);
  }
};

// GET /api/ai/credits/history
export const getCreditsHistory = async (c: Context<{ Bindings: Env }>) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const history = await getAiCreditHistory(auth.supabaseAdmin, auth.user.id);
    return c.json({ history });
  } catch (error: any) {
    console.error("[ai/credits/history]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil riwayat kredit AI." }, 500);
  }
};
