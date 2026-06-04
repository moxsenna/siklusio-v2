import { Hono } from "hono";
import { type Env } from "./env";
import { corsMiddleware } from "./middleware/cors";
import { createRateLimitMiddleware } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";

// Import routers
import recipesRouter from "./routes/ai.recipes";
import cycleGuideRouter from "./routes/ai.cycleGuide";
import habitCoachRouter from "./routes/ai.habitCoach";
import reassuranceRouter from "./routes/ai.reassurance";
import creditsRouter from "./routes/credits";
import checkoutRouter from "./routes/checkout";
import webhookMayarRouter from "./routes/webhook.mayar";
import adminRouter from "./routes/admin";
import avatarRouter from "./routes/avatar";

export const createApp = () => {
  const app = new Hono<{ Bindings: Env }>();

  // Enable dynamic CORS allowlist for trusted origins
  app.use("*", corsMiddleware());

  // Enable global rate limiting middleware
  app.use("*", createRateLimitMiddleware());

  // Mount routers
  app.route("/", recipesRouter);
  app.route("/", cycleGuideRouter);
  app.route("/", habitCoachRouter);
  app.route("/", reassuranceRouter);
  app.route("/", creditsRouter);
  app.route("/", checkoutRouter);
  app.route("/", webhookMayarRouter);
  app.route("/", adminRouter);
  app.route("/", avatarRouter);

  // Welcome Route
  app.get("/", (c) => {
    return c.text("Siklusio API Server (Hono + Cloudflare Workers) is running.");
  });

  // Global Error Handler
  app.onError(errorHandler);

  // Fallback Route
  app.notFound((c) => {
    return c.json({ error: "API Route Not Found" }, 404);
  });

  return app;
};
