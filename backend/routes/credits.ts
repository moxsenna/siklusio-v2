import { Hono } from "hono";
import { type Env } from "../env";
import { requireUser } from "../middleware/auth";
import { getAiCreditBalance, getAiCreditHistory } from "../services/aiCreditLedger";

const router = new Hono<{ Bindings: Env }>();

router.get("/api/ai/credits", async (c) => {
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

router.get("/api/ai/credits/history", async (c) => {
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

export default router;
