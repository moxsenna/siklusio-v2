import { Hono } from "hono";
import { type Env } from "../env";
import { handleMayarWebhook, verifyWebhookEndpoint } from "../controllers/webhook.mayar.controller";

const router = new Hono<{ Bindings: Env }>();

router.post("/api/payment/webhook", handleMayarWebhook);
router.get("/api/payment/webhook", verifyWebhookEndpoint);

export default router;
