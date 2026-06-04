import { Hono } from "hono";
import { type Env } from "../env";
import { uploadAvatar } from "../controllers/avatar.controller";

const router = new Hono<{ Bindings: Env }>();

router.post("/api/upload-avatar", uploadAvatar);

export default router;
