import { Hono } from "hono";
import { type Env } from "../env";
import {
  generateCycleReport,
  generateHabitsInsight,
  generateCalmingReassurance,
  getTodayReassurance,
} from "../controllers/ai.reassurance.controller";

const router = new Hono<{ Bindings: Env }>();

router.get("/api/tww-sanctuary/today", getTodayReassurance);
router.post("/api/generate-cycle-report", generateCycleReport);
router.post("/api/generate-habits-insight", generateHabitsInsight);
router.post("/api/generate-calming-reassurance", generateCalmingReassurance);

export default router;
