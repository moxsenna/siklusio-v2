import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

test('human handoff docs cover architecture, runbook, and codebase conventions', () => {
  for (const path of ['docs/ARCHITECTURE.md', 'docs/RUNBOOK.md', 'docs/CODEBASE_HANDOFF.md']) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
  }

  const architecture = readText('docs/ARCHITECTURE.md');
  assert.match(architecture, /backend\/index\.ts/);
  assert.match(architecture, /routes\//);
  assert.match(architecture, /services\//);
  assert.match(architecture, /\/api\/payment\/webhook/);
  assert.match(architecture, /AI credit/i);
  assert.match(architecture, /Phase 31/i);

  const runbook = readText('docs/RUNBOOK.md');
  assert.match(runbook, /npm run check/);
  assert.match(runbook, /npm run db:push:dry-run/);
  assert.match(runbook, /npm run db:lint/);
  assert.match(runbook, /wrangler deploy/);
  assert.match(runbook, /Cloudflare Pages/i);
  assert.match(runbook, /Smoke test/i);

  const handoff = readText('docs/CODEBASE_HANDOFF.md');
  assert.match(handoff, /graphify-out/);
  assert.match(handoff, /Bahasa Indonesia/i);
  assert.match(handoff, /naming/i);
  assert.match(handoff, /human/i);
  assert.match(handoff, /Phase 31/i);
});

test('merged audit report records Phase 31 completion and zero remaining main phases', () => {
  const report = readText('MERGED_AUDIT_REPORT.md');
  assert.match(report, /Phase 31 .*selesai/i);
  assert.match(report, /0 phase utama/i);
});
