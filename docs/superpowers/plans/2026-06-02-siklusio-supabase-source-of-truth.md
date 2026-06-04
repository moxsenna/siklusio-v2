# Siklusio Supabase Source Of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supabase migrations, database documentation, and generated types understandable and repeatable for future Siklusio developers.

**Architecture:** Keep `supabase/migrations/` as the only source of truth for new production schema changes. Treat root `supabase/*.sql` files as legacy/manual reference snippets until they are folded into migrations by a deliberate baseline task. Generate TypeScript database types from the linked Supabase project into `supabase/types/database.types.ts`, but do not wire them into app clients until the currently pending local migrations are applied or a local database is available.

**Tech Stack:** Supabase CLI 2.102.0, PostgreSQL migrations, TypeScript generated types, Node test runner.

---

### Task 1: Record Database CLI Workflow

**Files:**

- Modify: `package.json`
- Create: `scripts/database-docs.test.js`

- [x] **Step 1: Add database scripts**

Add root package scripts:

```json
{
  "db:migrations:list": "supabase migration list --linked",
  "db:push:dry-run": "supabase db push --dry-run",
  "db:types": "supabase gen types --linked --lang=typescript --schema public > supabase/types/database.types.ts",
  "db:lint": "supabase db lint --linked --schema public --fail-on error"
}
```

- [x] **Step 2: Add guardrail test**

Create `scripts/database-docs.test.js` to assert:

- `docs/DATABASE.md` exists.
- `supabase/README.md` exists.
- `supabase/types/database.types.ts` exists.
- root `package.json` exposes `db:push:dry-run`, `db:migrations:list`, and `db:types`.
- docs mention `supabase/migrations/` as source of truth.

### Task 2: Generate Supabase Types

**Files:**

- Create: `supabase/types/database.types.ts`

- [x] **Step 1: Verify CLI command support**

Run:

```powershell
npx supabase gen types --help
```

Expected: supports `--linked`, `--lang`, and `--schema`.

- [x] **Step 2: Generate linked public schema types**

Run:

```powershell
New-Item -ItemType Directory -Path 'supabase\types' -Force | Out-Null
npx supabase gen types --linked --lang=typescript --schema public > 'supabase\types\database.types.ts'
```

Expected: `supabase/types/database.types.ts` exists.

- [x] **Step 3: Document the caveat**

Because `supabase migration list --linked` shows three local migrations are not on remote yet, document that generated linked types are a production snapshot and must be regenerated after pending migrations are pushed.

### Task 3: Document Database Source Of Truth

**Files:**

- Create: `docs/DATABASE.md`
- Create: `supabase/README.md`
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] **Step 1: Write `docs/DATABASE.md`**

Document:

- source-of-truth rule.
- current migration list status.
- root SQL legacy/reference status.
- table/RPC inventory used by backend and mobile.
- commands for dry-run, migration list, lint, and type generation.
- future baseline rule.

- [x] **Step 2: Write `supabase/README.md`**

Document the folder contract:

- `migrations/` canonical for production changes.
- `types/database.types.ts` generated, do not edit by hand.
- root SQL files are legacy/manual references.
- use `supabase migration new <name>` for new migrations.

- [x] **Step 3: Update merged audit report**

Record Phase 27 status, pending migration caveat, generated types path, and remaining RLS/integration-test work for Phase 28.

### Task 4: Verify

**Files:**

- Verify: root project

- [x] **Step 1: Run focused guardrail test**

Run:

```powershell
node scripts/database-docs.test.js
```

Expected: PASS.

- [x] **Step 2: Run database commands**

Run:

```powershell
npm run db:migrations:list
npm run db:push:dry-run
npm run db:lint
```

Expected: commands execute without applying migrations. `db:migrations:list` and `db:push:dry-run` may still report the three known pending local migrations.

- [x] **Step 3: Run root check**

Run:

```powershell
npm run check
```

Expected: backend typecheck, mobile typecheck, and all tests pass.

- [x] **Step 4: Run Worker and Supabase dry-runs**

Run:

```powershell
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
npx supabase db push --dry-run
```

Expected: both pass without deploying/applying migrations.

- [x] **Step 5: Remove Worker dry-run output**

Run:

```powershell
Remove-Item -LiteralPath .wrangler-dry-run -Recurse -Force
Test-Path -LiteralPath .wrangler-dry-run
```

Expected: final output is `False`.

- [x] **Step 6: Run scoped whitespace check**

Run:

```powershell
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html' ':!fitur.md' ':!graphify-out/**' ':!mobile-app/graphify-out/**' ':!docs/superpowers/specs/2026-06-02-siklusio-demo-video-design.md' ':!docs/superpowers/plans/2026-06-02-siklusio-demo-video-portrait.md' ':!my-video/**' ':!landing/checkout-conversion-revised.html' ':!landing/siklusio-landing-revised (1).html'
```

Expected: no whitespace errors in this phase scope.
