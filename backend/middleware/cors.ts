import { cors } from "hono/cors";
import { type Context } from "hono";
import { type Env } from "../env";

const TRUSTED_ORIGINS = [
  "https://app.siklusio.web.id",
  "https://siklusio.web.id",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

export const corsMiddleware = () =>
  cors({
    origin: (origin, c: Context<{ Bindings: Env }>) => {
      if (!origin) return origin; // Allow no-origin requests (native/mobile/server calls)
      if (TRUSTED_ORIGINS.includes(origin)) {
        return origin;
      }
      const allowedEnv = c.env?.ALLOWED_ORIGINS;
      if (allowedEnv) {
        const list = allowedEnv.split(",").map((o: string) => o.trim());
        if (list.includes(origin)) {
          return origin;
        }
      }
      return undefined;
    },
  });
