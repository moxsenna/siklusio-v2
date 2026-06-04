# Siklusio Phase 29 Avatar Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden avatar upload beyond magic-byte validation by enforcing dimensions, stripping common metadata chunks, and documenting moderation policy.

**Architecture:** Keep image processing dependency-free inside the Cloudflare Worker. Parse dimensions from PNG/JPEG/WebP headers, reject oversized or unreadable images, strip metadata chunks where safe without full decode, and document future re-encode options separately.

**Tech Stack:** Hono Worker backend, Node Buffer parsing, R2 upload via AWS S3 client, Node test runner with tsx.

---

### Task 1: Dimension Guard

**Files:**

- Modify: `backend/storage/avatarImage.ts`
- Modify: `backend/storage/avatarImage.test.ts`
- Modify: `backend/index.ts`
- Modify: `backend/avatarUpload.test.ts`

- [x] **Step 1: Add failing tests for dimensions**

Run:

```powershell
node --import tsx backend/storage/avatarImage.test.ts
node --import tsx backend/avatarUpload.test.ts
```

Expected RED: new exports/policy missing and oversized image still reaches R2 path.

- [x] **Step 2: Implement dimension parser and route rejection**

Expected behavior:

```text
PNG/JPEG dimensions parse from headers.
Images over 2048x2048 or with unreadable dimensions return HTTP 400.
```

### Task 2: Metadata Stripping

**Files:**

- Modify: `backend/storage/avatarImage.ts`
- Modify: `backend/storage/avatarImage.test.ts`

- [x] **Step 1: Add failing sanitizer test**

Expected RED: `sanitizeAvatarImage` export does not exist.

- [x] **Step 2: Implement lightweight sanitizer**

Expected behavior:

```text
PNG ancillary chunks are removed.
JPEG APP metadata and COM segments are removed.
WebP EXIF/ICCP/XMP chunks are removed.
```

### Task 3: Policy Handoff

**Files:**

- Create: `docs/AVATAR_POLICY.md`
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] **Step 1: Document runtime limits**

Expected: docs explain auth, file size, accepted formats, dimension cap, metadata stripping, and moderation reset workflow.

- [x] **Step 2: Record Phase 29 in merged audit report**

Expected: remaining phase count decreases to Phase 30-31.
