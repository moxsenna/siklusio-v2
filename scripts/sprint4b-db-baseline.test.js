import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALLOWED_LEGACY_SUPABASE_ROOT_SQL,
  EXPECTED_MIGRATIONS,
  runBaselineChecks,
} from "./sprint4b-db-baseline-check.mjs";

const root = process.cwd();

test("Sprint 4B baseline script and closure doc exist", () => {
  assert.equal(existsSync(join(root, "scripts/sprint4b-db-baseline-check.mjs")), true);
  assert.equal(existsSync(join(root, "docs/SPRINT_4B_INFRA_DB_BASELINE.md")), true);
});

test("Sprint 4B baseline checks pass in repo", () => {
  const { pass, report } = runBaselineChecks();
  if (!pass) {
    const details = Object.entries(report)
      .filter(([, result]) => !result.pass)
      .map(([name, result]) => `${name}: ${result.findings.join("; ")}`)
      .join("\n");
    assert.fail(`Sprint 4B baseline drift:\n${details}`);
  }
});

test("legacy SQL allowlist matches infra guardrails test", () => {
  const guardrailsSource = readText("backend/infraGuardrails.test.ts");
  const match = guardrailsSource.match(
    /const ALLOWED_LEGACY_SUPABASE_ROOT_SQL = new Set\(\[([\s\S]*?)\]\);/,
  );
  assert.ok(match, "Could not parse ALLOWED_LEGACY_SUPABASE_ROOT_SQL from infraGuardrails.test.ts");

  const guardrailsFiles = [...match[1].matchAll(/"([^"]+\.sql)"/g)].map((m) => m[1]).sort();
  const baselineFiles = [...ALLOWED_LEGACY_SUPABASE_ROOT_SQL].sort();
  assert.deepEqual(
    baselineFiles,
    guardrailsFiles,
    "sprint4b allowlist must stay in sync with backend/infraGuardrails.test.ts",
  );
});

test("migration inventory is stable (22 files)", () => {
  assert.equal(EXPECTED_MIGRATIONS.length, 22);
});

test("db:baseline-check CLI exits 0", () => {
  const result = spawnSync(process.execPath, ["scripts/sprint4b-db-baseline-check.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}