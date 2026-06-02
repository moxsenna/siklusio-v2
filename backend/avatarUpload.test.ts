import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

test("avatar upload rejects non-image base64 before R2 upload", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));

    if (url.hostname === "project.supabase.co" && url.pathname === "/auth/v1/user") {
      return new Response(
        JSON.stringify({
          id: "11111111-1111-4111-8111-111111111111",
          email: "maya@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await app.request(
    "/api/upload-avatar",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        base64: Buffer.from("not an image").toString("base64"),
      }),
    },
    {
      VITE_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      R2_PUBLIC_URL: "https://cdn.siklusio.web.id",
    }
  );

  if (response.status !== 400) {
    console.error("DEBUG ERROR VALUE:", await response.text());
  }
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Format avatar tidak didukung. Gunakan WebP, PNG, atau JPEG.",
  });
});
