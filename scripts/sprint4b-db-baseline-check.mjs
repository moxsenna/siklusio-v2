/**
 * Sprint 4B — read-only infra/DB baseline check (no production secrets).
 * Run: npm run db:baseline-check
 *
 * Exit policy:
 * - exit 0: all repo-local baseline checks pass
 * - exit 1: hygiene drift detected (migration inventory, legacy SQL, secrets, types)
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** Keep in sync with backend/infraGuardrails.test.ts */
export const ALLOWED_LEGACY_SUPABASE_ROOT_SQL = new Set([
  "activity_history_sync_hardening.sql",
  "affiliate_conversions.sql",
  "affiliate_rpc.sql",
  "affiliates.sql",
  "ai_credits.sql",
  "checkout_sessions.sql",
  "community.sql",
  "community_admin.sql",
  "community_admin_rpc.sql",
  "community_avatar.sql",
  "community_comments_rpc.sql",
  "community_privacy_hardening.sql",
  "community_rate_limit.sql",
  "community_verify.sql",
  "coupons.sql",
  "crm_profiles.sql",
  "cycle_guides.sql",
  "cycle_guides_unique.sql",
  "habit_coach.sql",
  "pending_registrations.sql",
  "recipe_generations.sql",
  "schema.sql",
  "tww_sanctuary_letters.sql",
]);

export const EXPECTED_MIGRATIONS = [
  "20260531010100_ai_credits.sql",
  "20260531010200_habit_coach.sql",
  "20260531010300_cycle_guides.sql",
  "20260531010401_cycle_guides_unique.sql",
  "20260531010402_recipe_generations.sql",
  "20260531112800_ai_credit_topups.sql",
  "20260601094508_onboarding_completion_flag.sql",
  "20260601100443_pending_registration_auth_user_id.sql",
  "20260601101749_atomic_ai_credit_topup_processing.sql",
  "20260602164929_checkout_affiliate_support_tables.sql",
  "20260602174912_phase28_rls_function_grants.sql",
  "20260604094057_rate_limit_db.sql",
  "20260604100412_rate_limit_row_lock.sql",
  "20260604104737_rate_limit_atomic_lock.sql",
  "20260605134100_admin_crm.sql",
  "20260605154500_meta_capi_attribution.sql",
  "20260606120000_admin_crm_fix_pipeline.sql",
  "20260606130000_whatsapp_autoresponder.sql",
  "20260608120000_community_privacy_hardening.sql",
  "20260608123000_revoke_anon_community_user_id_select.sql",
  "20260608124500_regrant_anon_community_safe_columns.sql",
  "20260608130000_ai_daily_generation_cache.sql",
];

export const SENSITIVE_TABLES = [
  "community_posts",
  "community_comments",
  "profiles",
  "affiliates",
  "affiliate_conversions",
  "checkout_sessions",
  "pending_registrations",
  "ai_credit_balances",
  "ai_credit_ledger",
  "ai_credit_topups",
  "ai_daily_generation_cache",
  "admin_crm_leads",
  "admin_crm_notes",
  "admin_crm_payment_overrides",
  "admin_crm_audit_logs",
  "whatsapp_autoresponder_settings",
  "whatsapp_autoresponder_logs",
];

const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{20,}/,
  /\bsk_[a-zA-Z0-9]{20,}\b/,
  /\bsb_[a-zA-Z0-9]{20,}\b/,
  /\bDG3gCGwRT82hbRVP46fb\b/,
];

function gitLsFiles(pattern) {
  try {
    const output = execSync(`git ls-files ${pattern}`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return output ? output.split(/\r?\n/) : [];
  } catch {
    return [];
  }
}

function listMigrationFiles() {
  const dir = join(ROOT, "supabase", "migrations");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/** @returns {{ pass: boolean, findings: string[] }} */
export function checkMigrationHygiene() {
  const findings = [];
  const files = listMigrationFiles();

  if (files.length !== EXPECTED_MIGRATIONS.length) {
    findings.push(
      `Migration count mismatch: expected ${EXPECTED_MIGRATIONS.length}, found ${files.length}`,
    );
  }

  const expectedSet = new Set(EXPECTED_MIGRATIONS);
  for (const file of files) {
    if (!expectedSet.has(file)) {
      findings.push(`Unexpected migration file: ${file}`);
    }
  }
  for (const file of EXPECTED_MIGRATIONS) {
    if (!files.includes(file)) {
      findings.push(`Missing migration file: ${file}`);
    }
  }

  const seen = new Set();
  let prev = "";
  for (const file of files) {
    if (seen.has(file)) {
      findings.push(`Duplicate migration filename: ${file}`);
    }
    seen.add(file);
    if (prev && file < prev) {
      findings.push(`Out-of-order migration: ${file} before ${prev}`);
    }
    prev = file;
  }

  const databaseDocPath = join(ROOT, "docs", "DATABASE.md");
  if (existsSync(databaseDocPath)) {
    const databaseDoc = readFileSync(databaseDocPath, "utf8");
    for (const file of EXPECTED_MIGRATIONS) {
      if (!databaseDoc.includes(file)) {
        findings.push(`docs/DATABASE.md missing migration entry: ${file}`);
      }
    }
  } else {
    findings.push("docs/DATABASE.md not found");
  }

  return { pass: findings.length === 0, findings };
}

/** @returns {{ pass: boolean, findings: string[] }} */
export function checkLegacyRootSqlAllowlist() {
  const findings = [];
  const trackedRootSql = gitLsFiles("supabase/*.sql").filter(
    (path) => !path.includes("/migrations/"),
  );

  for (const trackedPath of trackedRootSql) {
    const fileName = trackedPath.replace(/^supabase\//, "");
    if (!ALLOWED_LEGACY_SUPABASE_ROOT_SQL.has(fileName)) {
      findings.push(`Unexpected tracked supabase root SQL: ${trackedPath}`);
    }
  }

  for (const allowed of ALLOWED_LEGACY_SUPABASE_ROOT_SQL) {
    const path = join(ROOT, "supabase", allowed);
    if (!existsSync(path)) {
      findings.push(`Allowed legacy SQL missing on disk: supabase/${allowed}`);
    }
  }

  return { pass: findings.length === 0, findings };
}

/** @returns {{ pass: boolean, findings: string[] }} */
export function checkSupabaseTempNotTracked() {
  const tracked = gitLsFiles("supabase/.temp");
  const trackedNested = gitLsFiles("supabase/.temp/**");
  const all = [...tracked, ...trackedNested];
  if (all.length > 0) {
    return {
      pass: false,
      findings: [`supabase/.temp must not be tracked: ${all.join(", ")}`],
    };
  }
  return { pass: true, findings: [] };
}

/** @returns {{ pass: boolean, findings: string[] }} */
export function checkGeneratedTypes() {
  const findings = [];
  const typesPath = join(ROOT, "supabase", "types", "database.types.ts");

  if (!existsSync(typesPath)) {
    return { pass: false, findings: ["supabase/types/database.types.ts not found"] };
  }

  const content = readFileSync(typesPath, "utf8");
  for (const table of SENSITIVE_TABLES) {
    const marker = `${table}: {`;
    if (!content.includes(marker)) {
      findings.push(`Generated types missing sensitive table: ${table}`);
    }
  }

  if (!content.includes("export type Database")) {
    findings.push("Generated types missing Database export");
  }

  return { pass: findings.length === 0, findings };
}

/** @returns {{ pass: boolean, findings: string[] }} */
export function checkSqlSecrets() {
  const findings = [];
  const sqlPaths = [...gitLsFiles("supabase/*.sql"), ...gitLsFiles("supabase/migrations/*.sql")];

  for (const relPath of sqlPaths) {
    const content = readFileSync(join(ROOT, relPath), "utf8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        findings.push(`Possible secret literal in ${relPath} (pattern ${pattern})`);
      }
    }
  }

  return { pass: findings.length === 0, findings };
}

/** @returns {{ pass: boolean, findings: string[] }} */
export function checkBaselineDocs() {
  const findings = [];
  const required = [
    "docs/DATABASE.md",
    "docs/SECURITY.md",
    "docs/SPRINT_4B_INFRA_DB_BASELINE.md",
    "supabase/README.md",
  ];

  for (const relPath of required) {
    if (!existsSync(join(ROOT, relPath))) {
      findings.push(`Missing baseline doc: ${relPath}`);
    }
  }

  const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  for (const script of ["db:migrations:list", "db:push:dry-run", "db:types", "db:baseline-check"]) {
    if (!packageJson.scripts?.[script]) {
      findings.push(`package.json missing script: ${script}`);
    }
  }

  return { pass: findings.length === 0, findings };
}

export function runBaselineChecks() {
  const checks = [
    ["migration_hygiene", checkMigrationHygiene],
    ["legacy_root_sql", checkLegacyRootSqlAllowlist],
    ["supabase_temp", checkSupabaseTempNotTracked],
    ["generated_types", checkGeneratedTypes],
    ["sql_secrets", checkSqlSecrets],
    ["baseline_docs", checkBaselineDocs],
  ];

  /** @type {Record<string, { pass: boolean, findings: string[] }>} */
  const report = {};
  let allPass = true;

  for (const [name, fn] of checks) {
    const result = fn();
    report[name] = result;
    if (!result.pass) allPass = false;
  }

  return { pass: allPass, report };
}

function main() {
  const { pass, report } = runBaselineChecks();

  console.log("Sprint 4B DB baseline check");
  for (const [name, result] of Object.entries(report)) {
    const status = result.pass ? "PASS" : "FAIL";
    console.log(`  [${status}] ${name}`);
    for (const finding of result.findings) {
      console.log(`         - ${finding}`);
    }
  }

  if (!pass) {
    console.error("\nBaseline check FAILED.");
    process.exit(1);
  }

  console.log("\nBaseline check PASSED.");
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain || process.argv[1]?.includes("sprint4b-db-baseline-check.mjs")) {
  main();
}
