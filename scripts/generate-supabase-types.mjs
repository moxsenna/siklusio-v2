import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF environment variable.");
  process.exit(1);
}

const outDir = resolve("supabase/types");
mkdirSync(outDir, { recursive: true });

const output = execFileSync(
  "npx",
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    "--project-id",
    projectRef,
    "--schema",
    "public",
  ],
  { encoding: "utf8", shell: process.platform === "win32" }
);

writeFileSync(resolve(outDir, "database.types.ts"), output);
console.log("Generated supabase/types/database.types.ts");
