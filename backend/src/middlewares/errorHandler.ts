import { type Context } from "hono";
import { type Env } from "../env";
import { logError } from "../logging/redaction";

export const errorHandler = (err: Error, c: Context<{ Bindings: Env }>) => {
  logError("Hono server error:", err.stack || err);
  return c.json({ error: "Terjadi kesalahan internal pada server." }, 500);
};
