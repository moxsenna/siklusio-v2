# Siklusio AI Free Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the legacy AI credit policy so free/included AI endpoints cannot silently spend paid fallback model capacity.

**Architecture:** Add a small model policy helper that separates `paid` AI features from `free_included` AI features. Paid features keep the current free + paid fallback model chain; free/included legacy endpoints use only free models until a future phase adds persistence and explicit credit pricing.

**Tech Stack:** Hono backend, OpenRouter model routing, TypeScript, node test runner.

---

### Task 1: Add AI Model Policy Helper

**Files:**
- Create: `backend/ai/modelPolicy.test.ts`
- Create: `backend/ai/modelPolicy.ts`

- [x] **Step 1: Write failing tests**

Test cases:

```ts
resolveOpenRouterModels({ policy: 'free_included', freeModel: 'free-main', paidModel: 'paid-main' })
```

Expected:

```ts
{ model: 'free-main', fallbackModels: ['nvidia/nemotron-3-super-120b-a12b:free'] }
```

And:

```ts
resolveOpenRouterModels({ policy: 'paid', freeModel: 'free-main', paidModel: 'paid-main' })
```

Expected includes paid fallback:

```ts
{ model: 'free-main', fallbackModels: ['nvidia/nemotron-3-super-120b-a12b:free', 'paid-main'] }
```

- [x] **Step 2: Verify RED**

Run:

```powershell
node --import tsx backend/ai/modelPolicy.test.ts
```

Expected: FAIL because `modelPolicy.ts` does not exist yet.

- [x] **Step 3: Implement helper**

Create:

```ts
export type AiCreditPolicy = 'paid' | 'free_included';
export const DEFAULT_OPENROUTER_FREE_MODEL = 'qwen/qwen3-next-80b-a3b-instruct:free';
export const DEFAULT_OPENROUTER_FREE_FALLBACK_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const DEFAULT_OPENROUTER_PAID_MODEL = 'openai/gpt-5-nano';
```

`resolveOpenRouterModels` should:
- prefer env free model when present.
- always include the free fallback model when different.
- include paid fallback only for `policy: 'paid'`.
- dedupe models.

- [x] **Step 4: Verify GREEN**

Run:

```powershell
node --import tsx backend/ai/modelPolicy.test.ts
```

Expected: PASS.

### Task 2: Apply Policy To Backend AI Routes

**Files:**
- Modify: `backend/index.ts`

- [x] **Step 1: Import model policy helper**

Import `resolveOpenRouterModels` from `./ai/modelPolicy`.

- [x] **Step 2: Paid features use paid policy**

Apply `resolveOpenRouterModels({ policy: 'paid', ... })` to:
- `POST /api/generate-recipes`
- `POST /api/habit-coach/generate`
- `POST /api/cycle-guide/generate`

- [x] **Step 3: Legacy included features use free policy**

Apply `resolveOpenRouterModels({ policy: 'free_included', ... })` to:
- `POST /api/generate-cycle-report`
- `POST /api/generate-habits-insight`
- `POST /api/generate-calming-reassurance`

Expected: no legacy/free endpoint passes `OPENROUTER_PAID_MODEL` to OpenRouter.

### Task 3: Update Documentation

**Files:**
- Modify: `docs/FEATURE_MATRIX.md`
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] **Step 1: Update feature matrix**

Document legacy routes as:
- auth required.
- 0 credits, included/free-for-now.
- free model only, no paid fallback.
- no persistence yet.

- [x] **Step 2: Update merged audit report**

Record Phase 25 status and residual future work: adding paid pricing/persistence later remains a separate product decision.

### Task 4: Verify

**Files:**
- Verify: root project

- [x] **Step 1: Run focused model policy test**

Run:

```powershell
node --import tsx backend/ai/modelPolicy.test.ts
```

Expected: PASS.

- [x] **Step 2: Run root check**

Run:

```powershell
npm run check
```

Expected: backend typecheck, mobile typecheck, and all tests pass.

- [x] **Step 3: Run Worker and Supabase dry-runs**

Run:

```powershell
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
npx supabase db push --dry-run
```

Expected: both pass without deploying/applying migrations.

- [x] **Step 4: Remove Worker dry-run output**

Run:

```powershell
Remove-Item -LiteralPath .wrangler-dry-run -Recurse -Force
Test-Path -LiteralPath .wrangler-dry-run
```

Expected: final output is `False`.

- [x] **Step 5: Run scoped whitespace check**

Run:

```powershell
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html' ':!fitur.md' ':!graphify-out/**' ':!mobile-app/graphify-out/**'
```

Expected: no whitespace errors in this phase scope.
