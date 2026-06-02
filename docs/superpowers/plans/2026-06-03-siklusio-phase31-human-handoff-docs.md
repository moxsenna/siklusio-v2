# Siklusio Phase 31 Human Handoff Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create durable handoff documentation so future human developers can understand Siklusio structure, deployment order, naming conventions, and safe long-term refactor paths.

**Architecture:** Keep this phase documentation-first and low-risk. Add a guardrail test that requires the docs to exist and mention critical release/decomposition topics, then create architecture, runbook, and codebase handoff docs.

**Tech Stack:** Markdown docs, Node test runner.

---

### Task 1: Handoff Docs Guardrail

**Files:**
- Create: `scripts/handoff-docs.test.js`

- [x] **Step 1: Write failing test**

Run:

```powershell
node scripts/handoff-docs.test.js
```

Expected RED: required docs do not exist yet and Phase 31 is not recorded in the merged audit report.

### Task 2: Architecture Handoff

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [x] **Step 1: Document current and target backend structure**

Expected behavior:

```text
Human developers can see current backend/index.ts responsibilities, target routes/services split, and safe extraction order.
```

### Task 3: Release Runbook

**Files:**
- Create: `docs/RUNBOOK.md`

- [x] **Step 1: Document release/deploy order**

Expected behavior:

```text
DB migrations, Worker deploy, GitHub/Pages deploy, and smoke tests are ordered safely.
```

### Task 4: Codebase Handoff

**Files:**
- Create: `docs/CODEBASE_HANDOFF.md`
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] **Step 1: Document conventions and exclusions**

Expected behavior:

```text
Human developers know naming/language rules, important docs, what not to touch, and remaining optional lanes.
```

### Task 5: Verification

**Files:**
- Modify: `scripts/handoff-docs.test.js`

- [x] **Step 1: Run focused and full verification**

Run:

```powershell
node scripts/handoff-docs.test.js
npm run check
```

Expected: focused handoff test passes and root check remains green.
