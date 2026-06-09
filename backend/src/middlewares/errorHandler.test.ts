import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "./errorHandler";

test("errorHandler logs internally but returns a generic message to clients", () => {
  let responseBody: unknown;
  let statusCode = 0;

  const c = {
    json: (body: unknown, status?: number) => {
      responseBody = body;
      statusCode = status ?? 200;
      return new Response(JSON.stringify(body), { status: statusCode });
    },
  } as Parameters<typeof errorHandler>[1];

  errorHandler(new Error("secret database connection detail"), c);

  assert.equal(statusCode, 500);
  assert.deepEqual(responseBody, { error: "Terjadi kesalahan internal pada server." });
});
