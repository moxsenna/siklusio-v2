# Siklusio Plaintext Password Removal

## Objective

Remove plaintext password storage from the paid checkout registration flow.

## Problem

`/api/checkout/register` currently stores `password` in `public.pending_registrations` for paid Mayar checkouts, then the payment webhook reads that password to create the Supabase Auth user. A database, backup, service-role, or log leak would expose user passwords directly.

## Chosen Approach

Create the Supabase Auth user before creating the Mayar payment link, but mark the user with server-owned `app_metadata.siklusio_access_status = "pending_payment"`. Store only non-secret registration data plus `user_id` in `pending_registrations`. When the Mayar webhook confirms payment, update the same Auth user to `siklusio_access_status = "active"`, grant the premium AI credit bonus, process affiliate attribution, and delete the pending row.

This avoids storing passwords while preserving the user-selected password and keeping checkout-created unpaid accounts distinguishable from active accounts.

## Tasks

1. Add a route-level regression test proving paid checkout does not include `password` in the pending registration upsert.
2. Add helper tests for access metadata if needed.
3. Update paid checkout to create an Auth user with pending-payment app metadata before persisting pending registration.
4. Update free checkout to create an active Auth user with the same metadata shape.
5. Update payment webhook to activate `pending.user_id` instead of creating a new Auth user from `pending.password`.
6. Create a Supabase migration with `supabase migration new` that removes/scrubs the password column and adds `user_id`.
7. Update `supabase/pending_registrations.sql` reference schema.
8. Adjust landing checkout copy/JS only if the backend no longer needs password.
9. Verify with `npm run check`, `npx supabase db push --dry-run`, Wrangler dry-run, and scoped whitespace check.

## Notes

- Direct mobile signups are not redesigned in this phase.
- A future phase should add a user-facing pending-payment screen if the app chooses to block `pending_payment` users at runtime.
- The migration should not invent filenames manually; use Supabase CLI.
