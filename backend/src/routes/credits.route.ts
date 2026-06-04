import { Hono } from "hono";
import { type Env } from "../env";
import { getCreditsBalance, getCreditsHistory } from "../controllers/credits.controller";

const router = new Hono<{ Bindings: Env }>();

router.get("/api/ai/credits", getCreditsBalance);
router.get("/api/ai/credits/history", getCreditsHistory);

export default router;
