# Siklusio Mobile API Base URL Guardrail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent production mobile/web builds from silently falling back to `http://localhost:3000` when `EXPO_PUBLIC_API_BASE_URL` is missing.

**Architecture:** Extract API base URL resolution into a pure helper with explicit development/production inputs. Keep development fallback behavior for Expo local work, but throw a clear configuration error in production-like builds without an explicit API URL.

**Tech Stack:** Expo Router, TypeScript, Node test runner with `tsx`, `EXPO_PUBLIC_*` environment variables.

---

## File Structure

- Create `mobile-app/src/lib/apiBaseUrl.ts`: pure resolver for configured URL, Expo debugger host, and development/production mode.
- Create `mobile-app/src/lib/apiBaseUrl.test.ts`: tests for configured URLs, local dev fallback, and production missing-env failure.
- Modify `mobile-app/src/lib/api.ts`: delegate base URL resolution to the pure helper.
- Modify `.env.example`: document `EXPO_PUBLIC_API_BASE_URL`.
- Modify `MERGED_AUDIT_REPORT.md`: update remediation progress and backlog status after verification.

---

## Tasks

- [ ] Write failing tests for production missing-env behavior.
- [ ] Implement `resolveApiBaseUrl`.
- [ ] Update `getApiBaseUrl()` to call the resolver.
- [ ] Document `EXPO_PUBLIC_API_BASE_URL`.
- [ ] Run targeted tests.
- [ ] Run full verification: `npm run check`, Worker dry-run, Supabase dry-run, scoped whitespace check.

---

## Expected Behavior

- `EXPO_PUBLIC_API_BASE_URL="https://api.example.com/"` resolves to `https://api.example.com`.
- Development with Expo host `192.168.1.10:8081` resolves to `http://192.168.1.10:3000`.
- Development without Expo host resolves to `http://localhost:3000`.
- Production without `EXPO_PUBLIC_API_BASE_URL` throws a clear error before any fetch.
- Invalid configured URLs throw a clear error instead of producing broken fetch calls.

---

## Known Follow-Up

This phase only fixes URL resolution. It does not yet centralize all mobile error messages or add offline retry/caching.
