# Siklusio Atomic Topup Webhook

## Objective

Make AI credit topup webhook processing idempotent and atomic so webhook retries or concurrent deliveries cannot grant credits more than once.

## Problem

The current topup webhook flow does this in the Worker:

1. Select topup by `mayar_transaction_id`.
2. If status is not `paid`, call `grant_ai_credits`.
3. Update topup status to `paid`.

Two webhook requests can both read `pending` before either updates status, causing duplicate credit grants.

## Approach

Move the topup claim, grant, and paid status transition into one Postgres RPC:

1. `UPDATE ai_credit_topups ... WHERE status = 'pending' RETURNING *` claims one row atomically.
2. If no row is claimed, return `not_found`, `already_paid`, or current status.
3. If claimed, call `public.grant_ai_credits` and return the new balance.
4. Let Postgres transaction rollback the status update if credit grant fails.

## Tasks

1. Add route-level regression test proving the webhook calls `process_paid_ai_credit_topup` instead of directly calling `grant_ai_credits` and then updating the table.
2. Refactor the Worker topup branch to call the RPC.
3. Create migration with `supabase migration new`.
4. Add secure SQL function with explicit `search_path`.
5. Revoke public/authenticated execute and grant execute to `service_role`.
6. Verify with `npm run check`, `supabase db push --dry-run`, Wrangler dry-run, and scoped whitespace check.
7. Update merged audit report.

## Notes

- This does not fix registration webhook idempotency yet; it focuses on AI credit topup double-grant risk.
- The RPC is intentionally narrow and should only be called from backend service role.
