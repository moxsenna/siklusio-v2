# Siklusio Avatar Upload Validation

## Objective

Reject non-image avatar uploads before they reach Cloudflare R2 and store accepted avatars with the correct content type and extension.

## Problem

`/api/upload-avatar` currently accepts any base64 string, decodes it, and uploads it as `.webp` with `ContentType: image/webp`. A user could upload arbitrary bytes, and valid PNG/JPEG data would be mislabeled as WebP.

## Approach

1. Add a pure detector for supported avatar image signatures.
2. Support WebP, PNG, and JPEG magic bytes.
3. Reject unsupported bytes with a 400 response before checking R2 configuration or uploading.
4. Use the detected extension and content type when creating the R2 object key.

## Verification

- Magic-byte tests must fail before helper implementation and pass after.
- Route test must fail before route implementation and pass after.
- `npm run check` must pass.
- Wrangler dry-run must pass.
- Scoped whitespace check must pass.
