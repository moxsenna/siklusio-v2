import test from "node:test";
import assert from "node:assert/strict";
import { buildAiFallbackCopy, extractAiFallbackInput } from "./aiFallback";

test("buildAiFallbackCopy maps insufficient credit errors to topup-friendly copy", () => {
  const copy = buildAiFallbackCopy({
    featureName: "Panduan Siklus",
    message: "Saldo kredit belum cukup. Butuh 40 kredit, saldo kamu 5.",
    status: 402,
  });

  assert.equal(copy.tone, "credit");
  assert.equal(copy.title, "Kredit AI belum cukup");
  assert.match(copy.message, /Butuh 40 kredit/);
  assert.match(copy.helper, /Top up kredit/);
});

test("buildAiFallbackCopy hides raw network errors behind connection copy", () => {
  const copy = buildAiFallbackCopy({
    featureName: "Resep Hari Ini",
    message: "TypeError: Failed to fetch",
  });

  assert.equal(copy.tone, "network");
  assert.equal(copy.title, "Koneksi ke AI sedang tidak stabil");
  assert.equal(copy.message.includes("Failed to fetch"), false);
  assert.match(copy.helper, /Coba lagi/);
});

test("buildAiFallbackCopy maps rate limits to a pause suggestion", () => {
  const copy = buildAiFallbackCopy({
    featureName: "Habit Coach",
    message: "rate limit exceeded",
    status: 429,
  });

  assert.equal(copy.tone, "rate_limit");
  assert.equal(copy.title, "AI perlu jeda sebentar");
  assert.match(copy.message, /terlalu banyak permintaan/i);
});

test("buildAiFallbackCopy gives empty errors a calm feature-specific fallback", () => {
  const copy = buildAiFallbackCopy({
    featureName: "TWW Sanctuary",
    message: "",
  });

  assert.equal(copy.tone, "server");
  assert.equal(copy.title, "TWW Sanctuary belum bisa merespons");
  assert.match(copy.message, /belum bisa dibuat/);
});

test("extractAiFallbackInput keeps useful 402 payload detail from API errors", () => {
  const input = extractAiFallbackInput(
    {
      status: 402,
      payload: {
        required: 15,
        balance: 2,
      },
      message: "Payment required",
    },
    "Gagal membuat resep hari ini.",
    "Resep Hari Ini",
  );

  assert.equal(input.status, 402);
  assert.equal(input.featureName, "Resep Hari Ini");
  assert.equal(input.message, "Saldo kredit belum cukup. Butuh 15 kredit, saldo kamu 2.");
});
