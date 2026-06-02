# Siklusio CORS Allowlist Hardening

## Objective

Replace global wildcard CORS with a clear allowlist so browser requests from untrusted sites do not receive permissive CORS headers.

## Problem

`backend/index.ts` currently uses `app.use("*", cors())`, which defaults to `Access-Control-Allow-Origin: *`. This is too broad for payment, auth-adjacent, AI, admin, and user-data endpoints.

## Approach

1. Add a small helper that resolves trusted origins from defaults plus `ALLOWED_ORIGINS`.
2. Allow no-origin requests so native/mobile/server calls keep working.
3. Allow local development origins.
4. Do not emit `Access-Control-Allow-Origin` for untrusted browser origins.
5. Add route-level tests for trusted and untrusted origins.

## Verification

- CORS tests must fail before implementation and pass after.
- `npm run check` must pass.
- Wrangler dry-run must pass.
- Scoped whitespace check must pass.
