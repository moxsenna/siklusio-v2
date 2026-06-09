import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const ALLOWED_LEGACY_SUPABASE_ROOT_SQL = new Set([
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

const SECRET_ENV_KEYS = new Set([
  "OPENROUTER_API_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MAYAR_API_KEY",
  "MAYAR_WEBHOOK_TOKEN",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "META_CAPI_ACCESS_TOKEN",
  "META_TEST_MODE_SECRET",
  "FONNTE_TOKEN",
  "VIBENOVEL_MAYAR_FORWARD_TOKEN",
  "EXPO_PUBLIC_IMGBB_API_KEY",
]);

const KNOWN_LEAKED_LITERALS = ["DG3gCGwRT82hbRVP46fb"];

function gitLsFiles(pattern: string): string[] {
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

function parseEnvExampleAssignments(content: string): Map<string, string> {
  const assignments = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, "");
    assignments.set(key, value);
  }
  return assignments;
}

function isPlaceholderSecretValue(key: string, value: string): boolean {
  if (!value) return true;
  if (value.startsWith("your-")) return true;
  if (value === "false" || value === "true") return true;
  if (KNOWN_LEAKED_LITERALS.includes(value)) return false;

  if (!SECRET_ENV_KEYS.has(key)) return true;

  const looksLikeRealToken =
    value.length >= 16 &&
    !value.includes("your-") &&
    !value.includes("example") &&
    /^[A-Za-z0-9_\-=.:/+]+$/.test(value);

  return !looksLikeRealToken;
}

test("supabase/.temp must never be tracked by git", () => {
  const tracked = gitLsFiles("supabase/.temp");
  assert.deepEqual(
    tracked,
    [],
    `supabase/.temp must stay gitignored. Tracked files: ${tracked.join(", ") || "(none)"}`,
  );
});

test(".env.example secret keys use placeholders only", () => {
  const envPath = join(ROOT, ".env.example");
  const content = readFileSync(envPath, "utf8");
  const assignments = parseEnvExampleAssignments(content);
  const violations: string[] = [];

  for (const key of SECRET_ENV_KEYS) {
    const value = assignments.get(key);
    if (value === undefined) continue;
    if (!isPlaceholderSecretValue(key, value)) {
      violations.push(`${key}="${value}"`);
    }
  }

  for (const leaked of KNOWN_LEAKED_LITERALS) {
    if (content.includes(leaked)) {
      violations.push(`known leaked literal: ${leaked}`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `.env.example must not contain real secrets:\n${violations.join("\n")}`,
  );
});

test("new supabase root SQL files must use supabase/migrations instead", () => {
  const trackedRootSql = gitLsFiles("supabase/*.sql").filter(
    (path) => !path.includes("/migrations/"),
  );
  const unexpected: string[] = [];

  for (const trackedPath of trackedRootSql) {
    const fileName = trackedPath.replace(/^supabase\//, "");
    if (!ALLOWED_LEGACY_SUPABASE_ROOT_SQL.has(fileName)) {
      unexpected.push(trackedPath);
    }
  }

  assert.equal(
    unexpected.length,
    0,
    `Unexpected supabase root SQL detected:\n${unexpected.join("\n")}`,
  );
});

test("supabase/.temp stays present only as local CLI state", () => {
  const tempDir = join(ROOT, "supabase", ".temp");
  try {
    const stat = statSync(tempDir);
    assert.ok(stat.isDirectory());
  } catch {
    return;
  }

  const tracked = gitLsFiles("supabase/.temp/**");
  assert.deepEqual(tracked, []);
});
