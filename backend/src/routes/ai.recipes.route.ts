import { Hono } from "hono";
import { type Env } from "../env";
import { getTodayRecipes, generateRecipes } from "../controllers/ai.recipes.controller";

const router = new Hono<{ Bindings: Env }>();

router.get("/api/recipes/today", getTodayRecipes);
router.post("/api/generate-recipes", generateRecipes);

export default router;
