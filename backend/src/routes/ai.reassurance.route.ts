import { Hono } from "hono";
import { type Env } from "../env";
import {
  generateCycleReport,
  generateHabitsInsight,
  generateCalmingReassurance,
} from "../controllers/ai.reassurance.controller";

const router = new Hono<{ Bindings: Env }>();

router.post("/api/generate-cycle-report", generateCycleReport);
router.post("/api/generate-habits-insight", generateHabitsInsight);
router.post("/api/generate-calming-reassurance", generateCalmingReassurance);

export default router;
