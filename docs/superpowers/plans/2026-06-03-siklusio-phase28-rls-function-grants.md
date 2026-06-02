# Siklusio Phase 28 RLS Function Grants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden production Supabase RLS helper functions and RPC grants after Phase 1-27 migrations are live.

**Architecture:** Keep schema changes in one Supabase CLI migration so production, local replay, and handoff docs stay aligned. Restrict client-callable RPCs to the minimum required roles, make AI credit mutation functions service-role only, and verify with both static tests and production smoke.

**Tech Stack:** Supabase Postgres, Supabase CLI, Node test runner, Supabase JS smoke scripts, Siklusio Cloudflare Worker API.

---

### Task 1: Capture Production Grant Risk

**Files:**
- Read: `MERGED_AUDIT_REPORT.md`
- Read: `docs/DATABASE.md`
- Read: `supabase/*.sql`

- [x] **Step 1: Query function grant metadata**

Run:

```powershell
npx supabase db query --linked -o json "select p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute, has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute, has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by p.proname, args;"
```

Expected evidence: AI credit mutation functions must not remain executable by `anon` or `authenticated`; admin/community RPCs must not be executable by `anon`.

### Task 2: Create Phase 28 Migration

**Files:**
- Create: `supabase/migrations/20260602174912_phase28_rls_function_grants.sql`
- Test: `scripts/database-docs.test.js`

- [x] **Step 1: Create migration with Supabase CLI**

Run:

```powershell
npx supabase migration new phase28_rls_function_grants
```

Expected: Supabase CLI creates a timestamped migration file.

- [x] **Step 2: Restrict grants and harden helper functions**

Migration must:

```sql
REVOKE ALL ON FUNCTION public.grant_ai_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_ai_credits(UUID, INTEGER, TEXT, TEXT, UUID, JSONB) TO service_role;
```

Expected: all AI credit mutation RPCs are service-role only, community/admin RPCs are authenticated-only, and `is_admin(uid)` returns false when `uid` does not equal `auth.uid()`.

- [x] **Step 3: Add static guardrail test**

Run:

```powershell
node --test scripts/database-docs.test.js
```

Expected: the test validates Phase 28 migration contains the critical revoke/grant statements.

### Task 3: Apply And Verify Production

**Files:**
- Modify after apply: `docs/DATABASE.md`
- Modify after apply: `MERGED_AUDIT_REPORT.md`

- [ ] **Step 1: Dry-run migration**

Run:

```powershell
npm run db:push:dry-run
```

Expected: only `20260602174912_phase28_rls_function_grants.sql` is pending.

- [ ] **Step 2: Apply migration**

Run:

```powershell
npx supabase db push
```

Expected: migration applies successfully to linked production project.

- [ ] **Step 3: Regenerate generated types**

Run:

```powershell
npm run db:types
```

Expected: `supabase/types/database.types.ts` remains generated from the linked remote schema.

- [ ] **Step 4: Production smoke**

Run the production smoke script used in the release gate.

Expected: auth, onboarding, topup validation, AI credit RPC, and cleanup still pass after grant restrictions.

- [ ] **Step 5: Final verification**

Run:

```powershell
npm run check
npm run db:push:dry-run
npm run db:lint
```

Expected: tests pass, remote DB is up to date, and schema lint has no errors.
