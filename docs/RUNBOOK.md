# Siklusio Runbook

Last updated: 2026-06-03.
Phase 31 handoff snapshot.

This runbook is the safe operating order for local verification, database migrations, Cloudflare Worker deploys, Cloudflare Pages releases, and production smoke tests.

## Golden Rule

Deploy database first when code depends on new schema. Deploy Worker second when API behavior changes. Deploy or merge GitHub for Cloudflare Pages only after DB and Worker are safe.

## Daily Local Verification

From repository root:

```powershell
git status --short --branch
npm run check
```

For mobile dependency health:

```powershell
cd mobile-app
npx expo install --check
npx expo-doctor@latest
npm run build:web
cd ..
```

For Worker bundle safety without deploying:

```powershell
npx wrangler deploy backend/index.ts --dry-run
```

For database safety without applying migrations:

```powershell
npm run db:migrations:list
npm run db:push:dry-run
npm run db:lint
```

## Release Branch Prep

1. Work from a clean release worktree or branch.
2. Stage only intended release files.
3. Keep these out of audit/release staging unless explicitly requested: `graphify-out/`, `fitur.md`, `my-video/`, revised landing files, `.bak` landing files, and unrelated workspace-main state.
4. Run `git diff --check` before committing.
5. Commit small checkpoints by phase.
6. Push the release branch before merging to `main`.

## Supabase Migration Order

Before applying:

```powershell
npm run db:migrations:list
npm run db:push:dry-run
npm run db:lint
```

Apply only after the dry-run contains exactly the expected migrations:

```powershell
npx supabase db push
npm run db:types
npm run db:push:dry-run
npm run db:lint
```

Commit the migration, generated types, and docs together.

If `db:lint` fails due to transient Supabase circuit breaker/auth service errors, wait and retry once. If it fails with schema errors, stop and fix the migration.

## Cloudflare Worker Deploy

Use this when backend/API behavior changes:

```powershell
npm run check
npx wrangler deploy backend/index.ts --dry-run
npx wrangler deploy backend/index.ts
```

After deploy, record the Worker version id in `MERGED_AUDIT_REPORT.md` if this is part of the audit cycle.

Minimum Worker smoke:

```text
GET  https://api.siklusio.web.id/
GET  https://api.siklusio.web.id/api/payment/webhook
POST https://api.siklusio.web.id/api/checkout/topup with invalid package should fail safely
POST https://api.siklusio.web.id/api/upload-avatar with oversized image should return 400
```

Authenticated production smoke should also verify:

1. Pending-payment auth user is blocked by app metadata until payment success.
2. Onboarding profile update works through RLS.
3. AI credit topup cannot spoof package price/credits.
4. Paid topup webhook/RPC is idempotent.
5. Direct authenticated client cannot call service-role-only AI credit grant RPC.
6. Community feed RPC still works for authenticated users.
7. Affiliate service-role helper works and cleanup succeeds.

## Cloudflare Pages / GitHub Deploy

Cloudflare Pages is Git-backed for the app/landing production deployments. Push or fast-forward `main` only after Supabase and Worker checks are safe.

Expected order:

1. Merge or fast-forward release branch into `main`.
2. Push `main` to GitHub.
3. Watch GitHub Actions and Cloudflare Pages deployments.
4. If direct Wrangler deploy secrets are unavailable in GitHub Actions, the workflow should skip that direct deploy step instead of failing the release.
5. Confirm Cloudflare Pages production source commit for `siklusio-landing` and `siklusio-v2`.

Pages smoke:

```text
GET https://siklusio.web.id/
GET https://siklusio.web.id/checkout
GET https://app.siklusio.web.id/
GET https://app.siklusio.web.id/payment-pending
```

## Checkout Smoke

Use test identities only. Never print secrets or raw PII into logs/reports.

Smoke coverage:

1. Premium checkout returns a payment URL only after `pending_registrations` and `checkout_sessions` are stored.
2. Pending Auth user has `app_metadata.siklusio_access_status = "pending_payment"`.
3. Failed checkout cleanup deletes the pending Auth user and pending registration.
4. Payment webhook with missing/invalid callback token fails closed.
5. Paid webhook activates the existing pending Auth user, grants premium initial AI credits once, and removes pending registration.

## AI Credit Smoke

Smoke coverage:

1. `GET /api/ai/credits` returns a balance for an authenticated user.
2. Invalid topup package id returns 400 before Mayar creation.
3. Paid topup webhook calls `process_paid_ai_credit_topup` once.
4. Replayed paid topup webhook returns already-processed behavior without double grant.
5. Direct authenticated Supabase client cannot execute service-role-only mutation RPCs.

## Rollback Notes

1. For Worker regressions, redeploy the last known-good Worker version or commit.
2. For Pages regressions, roll back the Cloudflare Pages production deployment to the previous successful source commit.
3. For database migrations, do not improvise rollback SQL in production. Create and review a forward-fix migration unless the rollback was already designed and tested.
4. For payment/webhook regressions, prefer disabling the affected checkout entry point over letting webhook processing become inconsistent.
5. Keep incident notes in `MERGED_AUDIT_REPORT.md` or a dated runbook addendum.

## Release Evidence Checklist

A release is not ready to call safe until the final report includes evidence for:

1. `npm run check`
2. `npm run db:push:dry-run`
3. `npm run db:lint`
4. `npx expo install --check`
5. `npx expo-doctor@latest`
6. `npm run build:web` from `mobile-app/`
7. `npx wrangler deploy backend/index.ts --dry-run`
8. Supabase apply status, if migrations were pending
9. Worker deploy version, if backend changed
10. Cloudflare Pages production source commit, if app/landing changed
11. Production smoke test summary
