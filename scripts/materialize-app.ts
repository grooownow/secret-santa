import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyModule } from "./apply-module";

/**
 * Materializes App from the repo: copy every tracked file into `destDir`,
 * then apply the `persistence` and `observability` modules on top (file
 * overwrite + package.json merge — see apply-module.ts). This is the
 * mechanical half of the round-trip Task 5 verified out-of-tree:
 * Landing + persistence + observability = App.
 *
 * "Tracked files" is deliberately git-driven (`git ls-files`), not a
 * hand-walked directory copy — it inherits .gitignore for free, so
 * node_modules/.next/.pglite/etc. are excluded because they were never
 * tracked, not because this script guessed a prefix list. The explicit
 * exclusion filter below is a defensive backstop, not the primary mechanism.
 */
const EXCLUDED_PREFIXES = [
  ".git/",
  "node_modules/",
  ".pglite/",
  ".next/",
  "test-results/",
  "playwright-report/",
];

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
}

function trackedFiles(root: string): string[] {
  const out = execFileSync("git", ["-C", root, "ls-files", "-z"], {
    encoding: "utf8",
  });
  return out.split("\0").filter(Boolean);
}

export function materializeApp(destDir: string): void {
  const root = repoRoot();
  mkdirSync(destDir, { recursive: true });

  const files = trackedFiles(root).filter(
    (rel) => !EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix)),
  );
  for (const rel of files) {
    const dest = join(destDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(root, rel), dest);
  }

  applyModule("persistence", destDir);
  applyModule("observability", destDir);
}

// CLI: `tsx scripts/materialize-app.ts <dest-dir>` materializes into <dest-dir>.
if (process.argv[1] && process.argv[1].endsWith("materialize-app.ts")) {
  const dest = process.argv[2];
  if (!dest) {
    console.error("usage: tsx scripts/materialize-app.ts <dest-dir>");
    process.exit(1);
  }
  materializeApp(resolve(dest));
  console.log(`Materialized App into ${dest}`);
}
