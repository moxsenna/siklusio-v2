# Siklusio Checkout Session Error Handling

## Objective

Prevent paid checkout from returning a Mayar payment URL when the internal `checkout_sessions` insert fails.

## Problem

The paid checkout flow creates a Mayar link and then inserts a `checkout_sessions` row, but it does not check the insert error before returning `paymentUrl`. If the insert fails, the customer can pay with no reliable internal checkout record for reconciliation, attribution, or premium bonus reference.

## Approach

1. Add a route-level regression test that makes the `checkout_sessions` insert fail.
2. Return a 500 error instead of `paymentUrl`.
3. Clean up the newly created pending Auth user and pending registration row for this checkout attempt.
4. Leave previously pending users intact when the request is a retry for an existing pending-payment user.

## Verification

- Focused checkout test must fail before implementation and pass after.
- `npm run check` must pass.
- Wrangler dry-run must pass because backend behavior changes.
- Scoped whitespace check must pass.
