import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL,
  DEFAULT_OPENROUTER_FREE_MODEL,
  DEFAULT_OPENROUTER_PAID_MODEL,
  resolveOpenRouterModels,
} from "./modelPolicy";

test("free_included AI policy never includes the paid fallback model", () => {
  const models = resolveOpenRouterModels({
    policy: "free_included",
    freeModel: "free-main",
    paidModel: "paid-main",
  });

  assert.deepEqual(models, {
    model: "free-main",
    fallbackModels: [DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL],
  });
});

test("paid AI policy keeps the paid fallback model", () => {
  const models = resolveOpenRouterModels({
    policy: "paid",
    freeModel: "free-main",
    paidModel: "paid-main",
  });

  assert.deepEqual(models, {
    model: "free-main",
    fallbackModels: [DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL, "paid-main"],
  });
});

test("model policy falls back to defaults and dedupes repeated models", () => {
  const freeIncluded = resolveOpenRouterModels({
    policy: "free_included",
    freeModel: DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL,
    paidModel: DEFAULT_OPENROUTER_PAID_MODEL,
  });

  assert.deepEqual(freeIncluded, {
    model: DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL,
    fallbackModels: [],
  });

  const paid = resolveOpenRouterModels({
    policy: "paid",
    freeModel: undefined,
    paidModel: undefined,
  });

  assert.deepEqual(paid, {
    model: DEFAULT_OPENROUTER_FREE_MODEL,
    fallbackModels: [DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL, DEFAULT_OPENROUTER_PAID_MODEL],
  });
});
