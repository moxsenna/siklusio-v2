# Siklusio Runbook

Last updated: 2026-06-04.
Developer operations handbook after repository reorganization.

This runbook defines the safe operating sequence for local verification, database migrations,
type generation, Cloudflare Worker dry-runs and deployments, and smoke testing.

---

## Golden Rule

Deploy the database schema changes first when code depends on a new schema.
Deploy the Worker second when API behavior changes.
Deploy or merge to GitHub for Cloudflare Pages ONLY after both the DB and Worker are verified and safe.

---

## Daily Local Verification

Run the following checks from the repository root to verify project health:

```bash
# General branch check and run verification tasks (backend/mobile typechecks and tests)
git status --short --branch
npm run check
```

For mobile dependency health and local web builds specifically:

```bash
# Run typechecks for the mobile application
npm run typecheck:mobile

# Navigate to the mobile-app folder to diagnose dependencies and build web bundles
cd mobile-app
npx expo-doctor@latest
npm run build:web
cd ..
```

---

## Supabase Migration Workflow

Before applying migrations, verify their status and execute a dry-run:

```bash
# List migration status (applied vs pending)
npm run db:migrations:list

# Perform dry-run push to test migrations against the remote DB
npm run db:push:dry-run

# Run linter on database schema
npm run db:lint
```

If the checks succeed and list exactly the expected migrations, apply them:

```bash
# Apply pending migrations to the database
npx supabase db push

# Generate updated TypeScript types based on the new schema
npm run db:types

# Re-run checks to verify everything is in sync and clean
npm run db:push:dry-run
npm run db:lint
```

Always commit the migration files, generated TypeScript types, and documentation updates together.

---

## Supabase Type Generation

Generate database type definitions directly from the remote Supabase project:

- **Type Output Destination**: `supabase/types/database.types.ts`
- **Commands**: `npm run generate:types` or `npm run db:types`

*Note: This script (`scripts/generate-supabase-types.mjs`) is Windows-safe. It expects the `SUPABASE_PROJECT_REF` environment variable to be set. If the variable is missing, the script will print an error message and exit with code 1.*

---

## Backend Worker Dry Run

Validate the integrity of the Cloudflare Worker bundle before publishing:

- **Canonical Worker Source**: `backend/src/index.ts`
- **Wrangler Entrypoint**: Configured in `wrangler.jsonc` pointing to `backend/src/index.ts`

Run the dry-run check command:

```bash
# Run checks and then do a Wrangler deploy dry-run
npm run check
npm run deploy -- --dry-run
```

Ensure no type errors, bundler exceptions, or missing dependencies are reported.

---

## Backend Worker Deploy

Deploy the Worker to Cloudflare when API behavior changes:

```bash
# Ensure checks pass and perform the deployment
npm run check
npm run deploy
```

*(Note: `npm run deploy` maps to `wrangler deploy backend/src/index.ts` in `package.json`).*

After deploying, verify the minimum endpoint health:

```text
GET  https://api.siklusio.web.id/
GET  https://api.siklusio.web.id/api/payment/webhook
POST https://api.siklusio.web.id/api/checkout/topup (expected to fail safely with 400/401 on bad package/no auth)
POST https://api.siklusio.web.id/api/upload-avatar (expected to fail with 401 on unauthenticated)
```

---

## Mobile Smoke Test

Verify the user-facing mobile client flows:

1. **Autentikasi & Profile**: Verify a newly registered user goes through the onboarding flow and profile updates are stored successfully via RLS.
2. **Cycle & Habits**: Verify phase calendar loading and habit tracking checks update the database state correctly.
3. **Community Feed**: Verify authenticated users can fetch the community feed via the `get_community_feed` RPC and add comments or reactions.
4. **Theme Handling**: Toggle the system dark/light mode and confirm theme hooks (like `useColorScheme`) load the styling correctly.

---

## Checkout / Webhook Smoke Test

Verify checkout flow behavior using test identities (never print real secrets or PII):

1. **Checkout Creation**: Verify premium registration checkout returns a valid payment URL from Mayar only after `pending_registrations` and `checkout_sessions` are created.
2. **Blocked Access**: Verify a pending registration user has user metadata `app_metadata.siklusio_access_status` set to `"pending_payment"`.
3. **Registration Cleanup**: Verify failed/cancelled checkout sessions clean up and delete the pending Auth user and session metadata.
4. **Webhook Security**: Verify the Mayar webhook rejects requests missing or carrying an invalid webhook token (fails closed).
5. **Successful Activation**: Verify the paid webhook updates the user's status to active, removes the pending registration record, and grants initial AI credits once.

---

## AI Credit Smoke Test

Verify AI credit operations and safety:

1. **Credit Balance**: Verify `GET /api/ai/credits` fetches the current balance for authenticated users.
2. **Topup Validation**: Verify invalid package IDs are rejected with a 400 Bad Request before initiating checkout.
3. **Atomic Processing**: Verify the Mayar webhook calls the database function `process_paid_ai_credit_topup` exactly once per transaction.
4. **Idempotency**: Replay a paid webhook payload and confirm it returns success without double-granting credits.
5. **RLS Hardening**: Confirm a direct authenticated user client cannot invoke service-role-only database mutations (like manually granting credits).

---

## Rollback Notes

If a deployment causes production regressions, follow these steps:

1. **Worker Rollback**: Redeply the last known-good Worker version using the historical deployments tab in the Cloudflare dashboard or re-running deploy from the previous stable git commit.
2. **Pages Rollback**: Roll back the Cloudflare Pages deployment to the previous successful commit in the Cloudflare dashboard.
3. **Database Rollback**: Do not run manual rollback DDL scripts. Prepare, review, and apply a forward-fix migration to resolve schema regressions.
4. **Payment Webhook Rollback**: If webhook processing becomes unstable, temporarily disable checkout routes to avoid corrupted order states.

---

## Release Evidence Checklist

A release is considered ready and safe only after providing evidence for:

1. `npm run check` (Success)
2. `npm run db:push:dry-run` (Clean / No unapplied migrations)
3. `npm run db:lint` (Success / No schema issues)
4. `npm run typecheck:mobile` (Success / No type errors)
5. `npx expo-doctor@latest` (Passed inside `mobile-app/`)
6. `npm run build:web` (Successful build inside `mobile-app/`)
7. `npm run deploy -- --dry-run` (Success)
8. Supabase migration apply logs (if database migrations were pending)
9. Worker deployed version details (if backend source changed)
10. Production commit hashes for landing and mobile code
11. Manual smoke test confirmation checklist
