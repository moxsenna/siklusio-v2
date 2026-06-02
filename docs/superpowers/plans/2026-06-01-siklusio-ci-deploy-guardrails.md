# Siklusio CI and Deploy Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository's root verification command usable for humans and fix the stale Cloudflare Pages project name in the landing deploy workflow.

**Architecture:** Keep the root project focused on backend typechecking while delegating mobile checks to `mobile-app`. Use a Node-based test runner so Windows PowerShell, bash, and CI can run the same test command without shell-specific globbing.

**Tech Stack:** npm scripts, TypeScript, Node.js, tsx, GitHub Actions, Wrangler.

---

## Execution status

- 2026-06-01: Baseline reproduced. `npm run lint` failed because root `tsconfig.json` compiled `mobile-app` with stale `@/* -> ./frontend/src/*` alias.
- 2026-06-01: Root `tsconfig.json` scoped to `backend/**/*.ts`; `npm run lint` now passes.
- 2026-06-01: Added `scripts/run-tests.mjs`, root `npm test`, root `npm run check`, and `mobile-app` `typecheck` script.
- 2026-06-01: `npm run check` passes.
- 2026-06-01: `.github/workflows/deploy-landing.yml` now deploys to `siklusio-landing`.

## Files

- Modify: `tsconfig.json`
- Modify: `package.json`
- Modify: `mobile-app/package.json`
- Create: `scripts/run-tests.mjs`
- Modify: `.github/workflows/deploy-landing.yml`
- Modify: `MERGED_AUDIT_REPORT.md`

## Tasks

- [x] **Task 1: Reproduce root lint failure**

Run:

```bash
npm run lint
```

Expected before fix: FAIL with mobile alias errors.

- [x] **Task 2: Scope root TypeScript config to backend**

Change `tsconfig.json` to include only backend TypeScript files and exclude mobile, landing, dist, graphify output, and scratch artifacts.

- [x] **Task 3: Add cross-platform test runner**

Create `scripts/run-tests.mjs` that recursively discovers `*.test.ts` and `*.test.js`, skips generated/dependency folders, and runs TypeScript tests with `node --import tsx`.

- [x] **Task 4: Add official scripts**

Root scripts:

```json
{
  "lint": "npm run typecheck:backend",
  "typecheck:backend": "tsc --noEmit",
  "typecheck:mobile": "npm --prefix mobile-app run typecheck",
  "test": "node scripts/run-tests.mjs",
  "check": "npm run typecheck:backend && npm run typecheck:mobile && npm test"
}
```

Mobile script:

```json
{
  "typecheck": "tsc --noEmit"
}
```

- [x] **Task 5: Fix landing deploy project**

Change GitHub Actions command:

```yaml
command: pages deploy landing --project-name=siklusio-landing --branch=main
```

- [x] **Task 6: Verify**

Run:

```bash
npm run check
npx wrangler pages deployment list --project-name siklusio-landing
```

Expected: `npm run check` exits 0 and Wrangler can list deployments for `siklusio-landing`.
