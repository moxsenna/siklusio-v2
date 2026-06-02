# Siklusio Graphify Output Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tracked generated Graphify output from the working tree and document that it should be regenerated on demand, not maintained as source.

**Architecture:** Graphify output is treated as generated analysis output, not product source or hand-authored documentation. Runtime behavior remains unchanged; repository hygiene is improved through `.gitignore`, `ARCHITECTURE.md`, and the merged audit report.

**Tech Stack:** Git, PowerShell, Markdown docs, npm verification scripts, Wrangler dry-run, Supabase CLI dry-run.

---

### Task 1: Confirm Generated Output Scope

**Files:**
- Inspect: `graphify-out/`
- Inspect: `mobile-app/graphify-out/`
- Inspect: `mobile-app/assets/sounds/tww_meditation.mp3`
- Inspect: `mobile-app/src/lib/twwSanctuaryResult.ts`
- Inspect: `mobile-app/src/lib/twwSanctuaryResult.test.ts`

- [x] **Step 1: Check tracked graphify files**

Run:

```powershell
git ls-files graphify-out mobile-app/graphify-out | Measure-Object
```

Expected: tracked generated files are present before cleanup.

- [x] **Step 2: Check active TWW sound references**

Run:

```powershell
rg -n "tww_meditation|tww_acoustic_nature|tww_deep_healing|tww_lofi_chill|tww_cinematic_lullaby" mobile-app/src/lib/twwSanctuaryResult.ts mobile-app/src/lib/twwSanctuaryResult.test.ts
```

Expected: runtime mapping references the four mapped ambience files and does not reference `tww_meditation.mp3`.

### Task 2: Remove Generated Output And Ignore Future Copies

**Files:**
- Delete: `graphify-out/`
- Delete: `mobile-app/graphify-out/`
- Modify: `.gitignore`

- [x] **Step 1: Safely remove graphify directories**

Run:

```powershell
$cwd = (Resolve-Path -LiteralPath .).Path
$targets = @('graphify-out','mobile-app/graphify-out')
foreach ($relative in $targets) {
  $target = Resolve-Path -LiteralPath $relative -ErrorAction SilentlyContinue
  if ($target) {
    if (-not $target.Path.StartsWith($cwd, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove path outside workspace: $($target.Path)"
    }
    Remove-Item -LiteralPath $target.Path -Recurse -Force
  }
}
```

Expected: both generated directories are absent locally.

- [x] **Step 2: Ignore regenerated graphify output**

Set `.gitignore` graphify section to:

```gitignore
# Graphify generated output
graphify-out/
mobile-app/graphify-out/
```

Expected: future `/graphify` runs do not reintroduce generated output into normal `git status`.

### Task 3: Update Human Handoff Documentation

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `MERGED_AUDIT_REPORT.md`

- [x] **Step 1: Remove graphify-out from permanent repo tree**

Edit `ARCHITECTURE.md` so the directory tree no longer lists `graphify-out/` as a maintained source directory.

Expected: the architecture doc describes source structure without generated Graphify output.

- [x] **Step 2: Record Phase 21 in merged report**

Edit `MERGED_AUDIT_REPORT.md` to record:

```markdown
- Phase 21 graphify output cleanup is local and not committed/deployed yet.
- `graphify-out/` and `mobile-app/graphify-out/` were deleted locally.
- `.gitignore` ignores both directories.
- The user-deleted `mobile-app/assets/sounds/tww_meditation.mp3` is preserved because active TWW mapping uses four other sound files.
```

Expected: the long-term audit report explains what changed and why.

### Task 4: Verify Cleanup

**Files:**
- Verify: root project

- [x] **Step 1: Run root check**

Run:

```powershell
npm run check
```

Expected: lint, typecheck, and tests pass.

- [x] **Step 2: Run Worker dry-run**

Run:

```powershell
npx wrangler deploy --dry-run --outdir .wrangler-dry-run
```

Expected: Worker bundles successfully without deployment.

- [x] **Step 3: Remove Worker dry-run output**

Run:

```powershell
Remove-Item -LiteralPath .wrangler-dry-run -Recurse -Force
Test-Path -LiteralPath .wrangler-dry-run
```

Expected: final output is `False`.

- [x] **Step 4: Run Supabase dry-run**

Run:

```powershell
npx supabase db push --help
npx supabase db push --dry-run
```

Expected: CLI supports dry-run and reports pending migrations without applying them.

- [x] **Step 5: Run scoped whitespace check**

Run:

```powershell
git diff --check -- . ':!landing/checkout.html' ':!landing/index.html' ':!landing/landing2.html'
```

Expected: no whitespace errors outside known landing CRLF files.

- [x] **Step 6: Check generated output absence**

Run:

```powershell
Test-Path -LiteralPath graphify-out
Test-Path -LiteralPath mobile-app/graphify-out
```

Expected: both outputs are `False`.
