import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".wrangler",
  ".worktrees",
  ".expo",
  "dist",
  "graphify-out",
]);

const tests = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;

    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path);
      continue;
    }

    if (entry.endsWith(".test.ts") || entry.endsWith(".test.js")) {
      tests.push(path);
    }
  }
}

walk(root);
tests.sort();

if (tests.length === 0) {
  console.log("No tests found.");
  process.exit(0);
}

for (const testFile of tests) {
  console.log(`\n--- RUN ${testFile}`);
  const isTypeScript = testFile.endsWith(".ts");
  const command = process.execPath;
  const args = isTypeScript ? ["--import", "tsx", testFile] : [testFile];
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`\nAll ${tests.length} test files passed.`);
