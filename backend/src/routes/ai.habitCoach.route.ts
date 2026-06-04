import { Hono } from "hono";
import { type Env } from "../env";
import { getCurrentHabitPlan, generateHabitPlan } from "../controllers/ai.habitCoach.controller";

const router = new Hono<{ Bindings: Env }>();

router.get("/api/habit-coach/current", getCurrentHabitPlan);
router.post("/api/habit-coach/generate", generateHabitPlan);

export default router;
