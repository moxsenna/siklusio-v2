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

function pngWithDimensions(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}

test("avatar upload rejects oversized avatar dimensions before R2 upload", async (t) => {
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
        base64: pngWithDimensions(4096, 256).toString("base64"),
      }),
    },
    {
      VITE_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      R2_PUBLIC_URL: "https://cdn.siklusio.web.id",
    }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Dimensi avatar maksimal 2048x2048 piksel.",
  });
});
