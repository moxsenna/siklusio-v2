import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

test('database handoff docs, generated types, and scripts are present', () => {
  assert.equal(existsSync(join(root, 'docs/DATABASE.md')), true);
  assert.equal(existsSync(join(root, 'supabase/README.md')), true);
  assert.equal(existsSync(join(root, 'supabase/types/database.types.ts')), true);

  const packageJson = JSON.parse(readText('package.json'));
  assert.equal(packageJson.scripts['db:migrations:list'], 'supabase migration list --linked');
  assert.equal(packageJson.scripts['db:push:dry-run'], 'supabase db push --dry-run');
  assert.equal(
    packageJson.scripts['db:types'],
    'supabase gen types --linked --lang=typescript --schema public > supabase/types/database.types.ts'
  );

  const databaseDoc = readText('docs/DATABASE.md');
  assert.match(databaseDoc, /supabase\/migrations\/.*source of truth/i);
  assert.match(databaseDoc, /20260601094508_onboarding_completion_flag\.sql/);
  assert.match(databaseDoc, /supabase\/types\/database\.types\.ts/);
});
