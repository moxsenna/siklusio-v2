import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

test("CORS allows trusted Siklusio app origin", async () => {
  const response = await app.request("/not-found-for-cors-test", {
    headers: { origin: "https://app.siklusio.web.id" },
  });

  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.siklusio.web.id");
});

test("CORS does not allow untrusted browser origins", async () => {
  const response = await app.request("/not-found-for-cors-test", {
    headers: { origin: "https://evil.example" },
  });

  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
