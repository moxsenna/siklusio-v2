import { Hono } from "hono";
import { type Env } from "../env";
import { generateCycleGuide, getTodayCycleGuide } from "../controllers/ai.cycleGuide.controller";

const router = new Hono<{ Bindings: Env }>();

router.post("/api/cycle-guide/generate", generateCycleGuide);
router.get("/api/cycle-guide/today", getTodayCycleGuide);

export default router;
