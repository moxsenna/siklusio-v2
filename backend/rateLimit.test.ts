import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryRateLimiter, resolveRateLimitRule } from "./rateLimit";

test("memory rate limiter blocks requests after the configured max until the window resets", () => {
  let now = 1_000;
  const limiter = createMemoryRateLimiter({ now: () => now });
  const rule = { name: "checkout", max: 2, windowMs: 60_000 };

  const first = limiter.check("ip:1.2.3.4", rule);
  const second = limiter.check("ip:1.2.3.4", rule);
  const blocked = limiter.check("ip:1.2.3.4", rule);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 60);

  now += 60_000;
  const afterReset = limiter.check("ip:1.2.3.4", rule);
  assert.equal(afterReset.allowed, true);
  assert.equal(afterReset.remaining, 1);
});

test("resolveRateLimitRule matches only protected route groups", () => {
  const env = {};

  assert.equal(resolveRateLimitRule("POST", "/api/generate-recipes", env)?.name, "ai");
  assert.equal(resolveRateLimitRule("POST", "/api/habit-coach/generate", env)?.name, "ai");
  assert.equal(resolveRateLimitRule("POST", "/api/cycle-guide/generate", env)?.name, "ai");
  assert.equal(resolveRateLimitRule("POST", "/api/checkout/register", env)?.name, "checkout");
  assert.equal(resolveRateLimitRule("POST", "/api/checkout/topup", env)?.name, "checkout");
  assert.equal(resolveRateLimitRule("POST", "/api/payment/webhook", env)?.name, "webhook");
  assert.equal(resolveRateLimitRule("GET", "/api/admin/users", env), null);
});

test("resolveRateLimitRule accepts environment overrides", () => {
  const rule = resolveRateLimitRule("POST", "/api/checkout/register", {
    CHECKOUT_RATE_LIMIT_MAX: "3",
    CHECKOUT_RATE_LIMIT_WINDOW_SECONDS: "120",
  });

  assert.deepEqual(rule, {
    name: "checkout",
    max: 3,
    windowMs: 120_000,
  });
});
