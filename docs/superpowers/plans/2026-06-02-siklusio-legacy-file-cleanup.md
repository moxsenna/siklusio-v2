# Siklusio Legacy File Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tracked legacy/recovery/debug files that are no longer part of the Siklusio runtime, documentation, or test flow.

**Architecture:** Verify each tracked candidate has no active references, delete only the proven orphan files, and add narrow ignore rules so local recovery/debug artifacts do not get reintroduced. Keep Cloudflare secrets and other external deployment state out of this local cleanup.

**Tech Stack:** Git, ripgrep, npm verification scripts.

---

## File Structure

- Delete `restore.cjs`: local recovery script with hardcoded AI IDE transcript path.
- Delete `restore2.cjs`: second local recovery script with hardcoded AI IDE transcript path.
- Delete `test-api.js`: manual local HTTP script superseded by backend tests.
- Delete `backend/index_restored.ts`: empty restore artifact.
- Delete `metadata.json`: old AI Studio/Gemini metadata, not referenced by current app.
- Delete `siklusio_documentation.html`: stale generated HTML documentation superseded by markdown docs/audit reports.
- Modify `.gitignore`: ignore narrow local recovery/debug artifacts.
- Modify `MERGED_AUDIT_REPORT.md`: document Phase 20.

---

## Tasks

### Task 1: Prove Candidates Are Orphaned

- [x] Confirm candidates are tracked with `git ls-files`.
- [x] Inspect file content/size.
- [x] Search active source/config references excluding audit reports and generated graphify output.

### Task 2: Remove Legacy Files

- [x] Delete `restore.cjs`, `restore2.cjs`, `test-api.js`, `backend/index_restored.ts`, `metadata.json`, and `siklusio_documentation.html`.
- [x] Add narrow `.gitignore` entries for local recovery/debug artifacts.
- [x] Verify `git status --short` shows intended deletes only for the Phase 20 candidates.

### Task 3: Report And Verification

- [x] Add Phase 20 progress entry.
- [x] Update P3-1 status.
- [x] Run `npm run check`.
- [x] Run `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`.
- [x] Remove `.wrangler-dry-run` after dry-run.
- [x] Run `npx supabase db push --dry-run`.
- [x] Run scoped `git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html'`.

---

## Verification

- `npm run check`
- `npx wrangler deploy --dry-run --outdir .wrangler-dry-run`
- `npx supabase db push --dry-run`
- Scoped `git diff --check`
