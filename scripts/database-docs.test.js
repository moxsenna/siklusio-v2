import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

test("database handoff docs, generated types, and scripts are present", () => {
  assert.equal(existsSync(join(root, "docs/DATABASE.md")), true);
  assert.equal(existsSync(join(root, "supabase/README.md")), true);
  assert.equal(existsSync(join(root, "supabase/types/database.types.ts")), true);

  const packageJson = JSON.parse(readText("package.json"));
  assert.equal(packageJson.scripts["db:migrations:list"], "supabase migration list --linked");
  assert.equal(packageJson.scripts["db:push:dry-run"], "supabase db push --dry-run");
  assert.equal(packageJson.scripts["db:types"], "npm run generate:types");
  assert.equal(
    packageJson.scripts["db:baseline-check"],
    "node scripts/sprint4b-db-baseline-check.mjs",
  );

  const databaseDoc = readText("docs/DATABASE.md");
  assert.match(databaseDoc, /supabase\/migrations\/.*source of truth/i);
  assert.match(databaseDoc, /20260601094508_onboarding_completion_flag\.sql/);
  assert.match(databaseDoc, /supabase\/types\/database\.types\.ts/);
});

test("phase 28 database security migration restricts sensitive function grants", () => {
  const migration = readText("supabase/migrations/20260602174912_phase28_rls_function_grants.sql");

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.is_admin\(uid UUID\)/);
  assert.match(migration, /caller_uid IS DISTINCT FROM uid/);
  assert.match(migration, /SET search_path = ''/);

  for (const fn of [
    "ensure_ai_credit_balance",
    "grant_ai_credits",
    "charge_ai_credits",
    "process_paid_ai_credit_topup",
    "create_affiliate_with_coupon",
  ]) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(`));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\(`));
  }

  for (const fn of [
    "get_community_feed",
    "get_post_comments",
    "admin_get_moderation_queue",
    "admin_moderate_target",
    "admin_reset_user_avatar",
  ]) {
    assert.match(
      migration,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^\\n]+ FROM PUBLIC, anon;`),
    );
    assert.match(
      migration,
      new RegExp(
        `GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^\\n]+ TO authenticated, service_role;`,
      ),
    );
  }

  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.handle_new_user\(\) FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.community_reports_after_insert\(\) FROM PUBLIC, anon, authenticated;/,
  );
});
