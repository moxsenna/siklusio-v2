# Siklusio Basic API Rate Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a basic backend rate limit guardrail for abuse-prone Siklusio API routes.

**Architecture:** Keep the first implementation small and dependency-free. Add a pure fixed-window limiter that can be unit-tested with an injected clock/store, then mount a Hono middleware before route handlers so AI, checkout, and payment webhook requests can be rejected before expensive work or database calls.

**Tech Stack:** TypeScript, Hono on Cloudflare Workers, Node test runner with `tsx`.

---

## File Structure

- Create `backend/rateLimit.ts`: fixed-window memory limiter, request identity helper, route group matching, and Hono middleware factory.
- Create `backend/rateLimit.test.ts`: unit tests for fixed-window behavior and route matching.
- Modify `backend/index.ts`: import and mount the middleware after CORS and before API routes.
- Modify `.env.example`: document tunable rate-limit environment variables.
- Modify `backend/securityRoutes.test.ts`: add regression tests proving second matching requests are rejected before route work.
- Modify `MERGED_AUDIT_REPORT.md`: update Phase progress and P2-6 backlog status after verification.

---

### Task 1: Pure Fixed-Window Limiter

**Files:**

- Create: `backend/rateLimit.ts`
- Test: `backend/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("memory rate limiter blocks requests after the configured max until the window resets", () => {
  let now = 1_000;
  const limiter = createMemoryRateLimiter({ now: () => now });
  const rule = { name: "checkout", max: 2, windowMs: 60_000 };

  assert.equal(limiter.check("ip:1.2.3.4", rule).allowed, true);
  assert.equal(limiter.check("ip:1.2.3.4", rule).allowed, true);

  const blocked = limiter.check("ip:1.2.3.4", rule);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);

  now += 60_000;
  assert.equal(limiter.check("ip:1.2.3.4", rule).allowed, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx backend/rateLimit.test.ts`
Expected: FAIL because `backend/rateLimit.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement `createMemoryRateLimiter` with an injected clock, a `Map<string, bucket>`, `allowed`, `remaining`, `resetAt`, and `retryAfterSeconds`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx backend/rateLimit.test.ts`
Expected: PASS.

---

### Task 2: Route Matching and Middleware

**Files:**

- Modify: `backend/rateLimit.ts`
- Test: `backend/rateLimit.test.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Write route matching tests**

Add tests that `/api/generate-recipes` matches the AI rule, `/api/checkout/register` matches checkout, `/api/payment/webhook` matches webhook, and `/api/admin/users` does not match.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx backend/rateLimit.test.ts`
Expected: FAIL because route matching is not implemented.

- [ ] **Step 3: Implement route matching**

Add `resolveRateLimitRule(method, pathname, env)` with defaults:

```text
AI: 20 requests / 60 seconds
Checkout: 10 requests / 300 seconds
Webhook: 120 requests / 60 seconds
```

Support env overrides:

```text
AI_RATE_LIMIT_MAX
AI_RATE_LIMIT_WINDOW_SECONDS
CHECKOUT_RATE_LIMIT_MAX
CHECKOUT_RATE_LIMIT_WINDOW_SECONDS
WEBHOOK_RATE_LIMIT_MAX
WEBHOOK_RATE_LIMIT_WINDOW_SECONDS
```

- [ ] **Step 4: Mount middleware**

In `backend/index.ts`, import `createRateLimitMiddleware` and mount it after CORS:

```ts
app.use("*", createRateLimitMiddleware());
```

- [ ] **Step 5: Run targeted tests**

Run: `node --import tsx backend/rateLimit.test.ts`
Expected: PASS.

---

### Task 3: Route Regression Tests

**Files:**

- Modify: `backend/securityRoutes.test.ts`

- [ ] **Step 1: Write failing route tests**

Add a test where two unauthenticated AI requests from the same `cf-connecting-ip` with `AI_RATE_LIMIT_MAX=1` produce `401` then `429`, and a checkout request with `CHECKOUT_RATE_LIMIT_MAX=1` produces `400` then `429`.

- [ ] **Step 2: Run test to verify it fails before middleware is mounted**

Run: `node --import tsx backend/securityRoutes.test.ts`
Expected: FAIL before middleware integration; second request is not `429`.

- [ ] **Step 3: Verify after middleware**

Run: `node --import tsx backend/securityRoutes.test.ts`
Expected: PASS with `Retry-After` header present on blocked requests.

---

### Task 4: Docs and Verification

**Files:**

- Modify: `.env.example`
- Modify: `MERGED_AUDIT_REPORT.md`

- [ ] **Step 1: Document env variables**

Add a small "Backend rate limit" section to `.env.example`.

- [ ] **Step 2: Full verification**

Run:

```powershell
npm run check
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
npx supabase db push --dry-run
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html'
```

Expected: all pass, aside from normal CRLF warnings on Windows.

- [ ] **Step 3: Clean dry-run output**

Remove `.wrangler-dry-run` after verifying the path is inside the workspace.

---

## Self-Review

- Spec coverage: covers basic rate limit for AI, checkout, and webhook routes.
- Known limitation: in-memory Worker limiter is a first guardrail, not a globally consistent production limiter across all Cloudflare isolates.
- Follow-up: for stronger production guarantees, use Cloudflare WAF Rate Limiting Rules, Durable Objects, or KV-backed counters.
