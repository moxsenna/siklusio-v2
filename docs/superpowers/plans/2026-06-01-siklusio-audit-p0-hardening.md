# Siklusio Audit P0 Hardening Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-risk audit findings that can be fixed without redesigning the paid registration flow: authenticated TWW AI, server-owned topup packages, webhook fail-closed behavior, and environment documentation.

**Architecture:** Keep backend/index.ts changes minimal for this phase, because a larger route split should happen after security fixes. Add route-level tests through the exported Hono app so each security behavior is covered before implementation. Use server constants for AI topup packages so the client cannot define price or credit amount.

**Tech Stack:** TypeScript, Hono, node:test, tsx, Cloudflare Workers, Supabase service role, Expo client.

---

## Scope boundary

This plan intentionally does not implement the pending_registrations password redesign. That issue is P0, but it needs a product/security decision between invite link, pre-payment inactive user, or password reset flow after payment. This phase removes abuse paths that are clear and testable without changing registration UX.

## Execution status

- 2026-06-01: Task 1 completed. `backend/securityRoutes.test.ts` verifies unauthenticated TWW reassurance returns 401.
- 2026-06-01: Task 2 completed with a focused resolver test. `backend/payments/topupPackages.ts` is the server-owned package catalog, and the mobile client now sends only `packageId`.
- 2026-06-01: Task 3 completed. Mayar webhook now fails closed when `MAYAR_WEBHOOK_TOKEN` is missing and rejects invalid callback tokens.
- 2026-06-01: Task 4 verification completed for backend focused tests, mobile typecheck, and Wrangler dry-run.

## Files

- Create: `backend/securityRoutes.test.ts`
- Modify: `backend/index.ts`
- Modify: `mobile-app/components/common/CreditDetailModal.tsx`
- Modify: `.env.example`
- Optional after green: `MERGED_AUDIT_REPORT.md`

## Baseline commands

- Run focused backend route tests: `npx tsx backend/securityRoutes.test.ts`
- Run existing backend tests: `npx tsx backend/ai/helpers.test.ts && npx tsx backend/ai/habitCoachApi.test.ts && npx tsx backend/ai/cycleGuideApi.test.ts`
- Run mobile typecheck after client payload edit: `cd mobile-app; npx tsc --noEmit`
- Run Worker dry-run after backend changes: `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`

## Task 1: Require Auth for TWW Reassurance

**Files:**

- Create: `backend/securityRoutes.test.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/securityRoutes.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import app from "./index";

test("TWW calming reassurance requires an authenticated session before AI config", async () => {
  const response = await app.request(
    "/api/generate-calming-reassurance",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nickname: "Maya",
        userJournal: "Aku cemas menunggu hasil.",
      }),
    },
    {},
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing or invalid session" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
```

Expected before implementation: FAIL because the current route returns 500 with `OPENROUTER_API_KEY is not defined` instead of 401.

- [ ] **Step 3: Write minimal implementation**

In `backend/index.ts`, add auth at the top of `/api/generate-calming-reassurance`:

```ts
app.post("/api/generate-calming-reassurance", async (c) => {
  console.log("--> [BACKEND] Received request /api/generate-calming-reassurance");
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const { nickname, userJournal } = await c.req.json();
    const apiKey = c.env.OPENROUTER_API_KEY;
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run backend AI tests**

Run:

```bash
npx tsx backend/ai/helpers.test.ts
npx tsx backend/ai/habitCoachApi.test.ts
npx tsx backend/ai/cycleGuideApi.test.ts
```

Expected: all tests pass.

## Task 2: Make Topup Packages Server-Owned

**Files:**

- Modify: `backend/securityRoutes.test.ts`
- Modify: `backend/index.ts`
- Modify: `mobile-app/components/common/CreditDetailModal.tsx`

- [ ] **Step 1: Add failing test for tampered package body**

Append to `backend/securityRoutes.test.ts`:

```ts
test("topup checkout ignores client supplied price and credits", async () => {
  const calls: Array<{ table: string; payload?: any }> = [];

  const fakeSupabaseAdmin = {
    auth: {
      async getUser(token: string) {
        assert.equal(token, "valid-token");
        return { data: { user: { id: "user-1", email: "maya@example.com" } }, error: null };
      },
    },
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: { name: "Maya", whatsapp_number: "08123" }, error: null };
                },
              };
            },
          };
        },
        insert(payload: any) {
          calls.push({ table, payload });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };

  const originalFetch = globalThis.fetch;
  const originalCreateClient = (await import("@supabase/supabase-js")).createClient;

  try {
    // This test documents desired behavior. If direct module mocking is not
    // available in this repo, replace this with an extracted helper test:
    // resolveTopupPackage("coba_dulu") returns server-owned price/credits.
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          statusCode: 200,
          data: { link: "https://pay.example/topup", id: "mayar-topup-1" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )) as typeof fetch;

    const response = await app.request(
      "/api/checkout/topup",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          packageId: "coba_dulu",
          price: 1,
          credits: 999999,
        }),
      },
      {
        MAYAR_API_KEY: "mayar-key",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
      },
    );

    assert.equal(response.status, 200);
    assert.equal(calls[0].table, "ai_credit_topups");
    assert.equal(calls[0].payload.amount_rp, 9900);
    assert.equal(calls[0].payload.credits_amount, 300);
  } finally {
    globalThis.fetch = originalFetch;
    void originalCreateClient;
    void fakeSupabaseAdmin;
  }
});
```

- [ ] **Step 2: If route-level mocking is too brittle, test extracted resolver instead**

If the route test cannot mock Supabase cleanly without adding framework overhead, replace the test body with a focused helper test:

```ts
import { resolveTopupPackage } from "./payments/topupPackages";

test("resolveTopupPackage returns server-owned package values", () => {
  assert.deepEqual(resolveTopupPackage("coba_dulu"), {
    id: "coba_dulu",
    name: "Coba Dulu",
    credits: 300,
    price: 9900,
  });
  assert.equal(resolveTopupPackage("unknown"), null);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
```

Expected before implementation: FAIL because backend still uses client `price` and `credits`, or helper does not exist.

- [ ] **Step 4: Implement server package catalog**

In `backend/index.ts`, add near route helpers:

```ts
const TOPUP_PACKAGES = {
  coba_dulu: { id: "coba_dulu", name: "Coba Dulu", credits: 300, price: 9900 },
  teman_mingguan: { id: "teman_mingguan", name: "Teman Mingguan", credits: 1000, price: 24900 },
  sahabat_siklus: { id: "sahabat_siklus", name: "Sahabat Siklus", credits: 2500, price: 49000 },
  bekal_tenang: { id: "bekal_tenang", name: "Bekal Tenang", credits: 6000, price: 99000 },
} as const;

const resolveTopupPackage = (packageId: unknown) => {
  if (typeof packageId !== "string") return null;
  return TOPUP_PACKAGES[packageId as keyof typeof TOPUP_PACKAGES] || null;
};
```

Change `/api/checkout/topup`:

```ts
const { packageId } = await c.req.json();
const selectedPackage = resolveTopupPackage(packageId);

if (!selectedPackage) {
  return c.json({ error: "Paket topup tidak valid." }, 400);
}

const finalAmount = selectedPackage.price;
const credits = selectedPackage.credits;
```

- [ ] **Step 5: Update client payload**

In `mobile-app/components/common/CreditDetailModal.tsx`, change:

```ts
const data = await apiPostJson<{ paymentUrl?: string; error?: string }>("/api/checkout/topup", {
  packageId: pkg.id,
});
```

- [ ] **Step 6: Run verification**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
cd mobile-app
npx tsc --noEmit
```

Expected: backend focused tests pass and mobile typecheck passes.

## Task 3: Make Mayar Webhook Fail Closed When Secret Is Missing

**Files:**

- Modify: `backend/securityRoutes.test.ts`
- Modify: `backend/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add failing tests**

Append to `backend/securityRoutes.test.ts`:

```ts
test("payment webhook refuses to process when webhook token is not configured", async () => {
  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "payment.success", email: "maya@example.com" }),
    },
    {},
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Webhook secret is not configured" });
});

test("payment webhook rejects invalid callback token", async () => {
  const response = await app.request(
    "/api/payment/webhook",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-callback-token": "wrong-token",
      },
      body: JSON.stringify({ event: "payment.success", email: "maya@example.com" }),
    },
    { MAYAR_WEBHOOK_TOKEN: "correct-token" },
  );

  assert.equal(response.status, 401);
});
```

- [ ] **Step 2: Run tests to verify first test fails**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
```

Expected before implementation: FAIL because current webhook accepts missing configured token.

- [ ] **Step 3: Implement fail-closed behavior**

In `backend/index.ts`, change webhook token block:

```ts
const callbackToken = c.req.header("x-callback-token") || c.req.header("X-Callback-Token") || "";
const expectedToken = c.env.MAYAR_WEBHOOK_TOKEN || "";
if (!expectedToken) {
  console.error("MAYAR_WEBHOOK_TOKEN secret is not configured");
  return c.json({ error: "Webhook secret is not configured" }, 500);
}
if (callbackToken !== expectedToken) {
  console.warn("--> Webhook rejected: invalid or missing X-Callback-Token");
  return c.json({ error: "Unauthorized webhook request" }, 401);
}
```

- [ ] **Step 4: Document env**

In `.env.example`, add:

```env
# Mayar payment
MAYAR_API_KEY="your-mayar-api-key"
MAYAR_WEBHOOK_TOKEN="your-mayar-webhook-callback-token"
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
```

Expected: all focused tests pass.

## Task 4: Verification and Report Update

**Files:**

- Optional modify: `MERGED_AUDIT_REPORT.md`

- [ ] **Step 1: Run backend tests**

Run:

```bash
npx tsx backend/securityRoutes.test.ts
npx tsx backend/ai/helpers.test.ts
npx tsx backend/ai/habitCoachApi.test.ts
npx tsx backend/ai/cycleGuideApi.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run mobile typecheck**

Run:

```bash
cd mobile-app
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Run Worker dry-run**

Run:

```bash
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
```

Expected: dry-run succeeds.

- [ ] **Step 4: Remove dry-run output**

Run:

```powershell
Remove-Item -Recurse -Force .wrangler-dry-run
```

Expected: `.wrangler-dry-run` removed.

- [ ] **Step 5: Update audit report status**

In `MERGED_AUDIT_REPORT.md`, add a "Remediation progress" note:

```md
## Remediation progress

- 2026-06-01: Phase 1 started. TWW auth, topup package validation, and webhook fail-closed behavior covered by `backend/securityRoutes.test.ts`.
```

## Next plan after this phase

Create a separate plan for `pending_registrations` password redesign. The recommended direction is:

1. Stop collecting password before payment, or do not persist it.
2. After webhook success, create an invite/set-password flow.
3. Store checkout session state with tokenized identifiers, not password.
4. Add tests for pending registration persistence and webhook account creation.
