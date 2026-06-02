# Siklusio Backend Log Redaction

## Objective

Prevent sensitive customer, payment, token, and avatar details from being written to backend logs while preserving useful operational signals.

## Problem

Several backend routes logged raw or near-raw payloads:

1. Mayar webhook raw body and parsed body.
2. Mayar checkout response body and payment URL.
3. Customer email in webhook processing messages.
4. Public avatar URL after upload.
5. Coupon and affiliate code values in checkout diagnostics.

These logs can expose PII, payment identifiers, URLs, or business-sensitive codes in production observability systems.

## Approach

1. Add a reusable log redaction helper for nested values.
2. Redact common sensitive keys and text patterns: email, phone, token, secret, URL, avatar, bank/account, user id, and transaction id.
3. Replace raw Mayar response logging with safe summaries.
4. Replace raw webhook payload logging with byte length and event/body summary.
5. Remove customer email, payment URL, transaction id, avatar URL, coupon code, and affiliate code values from route logs.

## Verification

- Redaction helper test must fail before helper implementation and pass after.
- Webhook route test must fail while raw webhook PII is logged and pass after.
- Checkout route test must fail while Mayar payment URL/transaction id is logged and pass after.
- `npm run check` must pass.
- Wrangler dry-run must pass.
- Scoped whitespace check must pass.
