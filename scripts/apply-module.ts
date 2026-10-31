import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

/**
 * Deterministic module applier — the mechanical half of a module install.
 *
 * `applyModule(name, root)` materializes `modules/<name>/` into `root`:
 *   1. copy every file under `modules/<name>/files/` to the same relative path
 *      under `root`;
 *   2. merge `fragments/package-deps.md`'s deps / devDeps / scripts into
 *      `root/package.json` (union; the module's pinned versions win);
 *   3. splice every other fragment's `<!-- apply ... -->` code block at its
 *      marker in the target file (idempotent; a second apply is a no-op).
 *
 * It does NO judgment wiring — a real install runs this as step 1 of the
 * module's apply-plan and then an agent reconciles the rest.
 */

export interface Directive {
  target: string;
  marker: string;
  body: string;
}

interface PackageDeps {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

type MergeField = keyof PackageDeps;
const MERGE_FIELDS: readonly MergeField[] = [
  "dependencies",
  "devDependencies",
  "scripts",
];

// ── file copy ────────────────────────────────────────────────────────────────

function walkFiles(dir: string, base: string = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(relative(base, full));
  }
  return out;
}

function copyFiles(moduleDir: string, root: string): string[] {
  const filesDir = join(moduleDir, "files");
  if (!existsSync(filesDir)) return [];
  const rels = walkFiles(filesDir);
  for (const rel of rels) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(filesDir, rel), dest);
  }
  return rels;
}

// ── package.json merge ───────────────────────────────────────────────────────

function parseJsonSection(md: string, heading: string): Record<string, string> {
  // Match a "## <heading>" section followed by a ```json fenced body whose
  // contents are the inner entries of an object (no surrounding braces).
  const re = new RegExp(
    "^## " + heading + "\\s*\\n+```json\\n([\\s\\S]*?)\\n```",
    "m",
  );
  const m = md.match(re);
  if (!m || m[1] === undefined) return {};
  return JSON.parse(`{${m[1]}}`) as Record<string, string>;
}

export function parsePackageDeps(md: string): PackageDeps {
  return {
    dependencies: parseJsonSection(md, "dependencies"),
    devDependencies: parseJsonSection(md, "devDependencies"),
    scripts: parseJsonSection(md, "scripts"),
  };
}

function mergePackageJson(root: string, deps: PackageDeps): string[] {
  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<
    string,
    unknown
  >;
  const added: string[] = [];
  for (const field of MERGE_FIELDS) {
    const incoming = deps[field];
    const keys = Object.keys(incoming);
    if (keys.length === 0) continue;
    const existing = (pkg[field] as Record<string, string> | undefined) ?? {};
    // Union; the module's pinned versions win, unrelated entries untouched.
    pkg[field] = { ...existing, ...incoming };
    added.push(...keys.map((k) => `${field}.${k}`));
  }
  // Preserve the 2-space / trailing-newline house style.
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return added;
}

// ── fragment splice ──────────────────────────────────────────────────────────

/** Strip leading and trailing blank lines, keep internal ones. */
function trimBlankLines(body: string): string {
  const lines = body.split("\n");
  while (lines.length > 0 && lines[0]!.trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === "") {
    lines.pop();
  }
  return lines.join("\n");
}

export function parseDirectives(md: string): Directive[] {
  const re =
    /<!--\s*apply\s+target="([^"]+)"\s+marker="([^"]+)"\s*-->\s*```[a-zA-Z]*\n([\s\S]*?)\n```/g;
  const out: Directive[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    out.push({
      target: m[1]!,
      marker: m[2]!,
      body: trimBlankLines(m[3]!),
    });
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a matcher for the marker *token* as it appears in a target file: the
// `<!-- MARKER -->` comment inside one of the wrappers we support — a line
// comment `// <!-- MARKER -->`, a block comment `/* <!-- MARKER --> */`, or a
// JSX-wrapped block comment `{/* <!-- MARKER --> */}`.
function markerTokenRe(marker: string): RegExp {
  const esc = escapeRegExp(marker);
  return new RegExp(
    "\\{?\\s*(?://|/\\*)\\s*<!--\\s*" + esc + "\\s*-->\\s*(?:\\*/)?\\s*\\}?",
  );
}

/** Trim + drop a single trailing `;` so `})` and `});` compare equal. */
function normLine(l: string): string {
  return l.trim().replace(/;+$/, "");
}

/** Is `needle` already present in `hay` as a contiguous (indent-agnostic) block? */
function containsBlock(hay: string[], needle: string[]): boolean {
  if (needle.length === 0) return true;
  const h = hay.map(normLine);
  const n = needle.map(normLine);
  const last = n.length - 1;
  for (let i = 0; i + n.length <= h.length; i++) {
    let ok = true;
    for (let j = 0; j <= last; j++) {
      const hayLine = h[i + j]!;
      const needleLine = n[j]!;
      // The first line of a previously-spliced block may carry a
      // non-whitespace prefix (e.g. `})` before an inline marker), and the
      // last line may carry a trailing suffix beyond the `;` normLine
      // already strips. A single-line body is both at once, so it can have
      // a prefix AND a suffix — check "contains" rather than "equals".
      const matches =
        j === 0 && j === last
          ? hayLine.includes(needleLine)
          : j === 0
            ? hayLine.endsWith(needleLine)
            : j === last
              ? hayLine.startsWith(needleLine)
              : hayLine === needleLine;
      if (!matches) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

type SpliceResult = "spliced" | "skipped";

function spliceDirective(root: string, dir: Directive): SpliceResult {
  const targetPath = join(root, dir.target);
  if (!existsSync(targetPath)) {
    throw new Error(
      `apply target not found: ${dir.target} (marker "${dir.marker}")`,
    );
  }
  const content = readFileSync(targetPath, "utf8");
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const bodyLines = dir.body.split("\n");

  // Idempotency: if the body is already present, this is a no-op — even if the
  // marker has already been consumed by a previous apply.
  if (containsBlock(lines, bodyLines)) return "skipped";

  const tokenRe = markerTokenRe(dir.marker);
  const idx = lines.findIndex((l) => tokenRe.test(l));
  if (idx === -1) {
    throw new Error(`marker "${dir.marker}" not found in ${dir.target}`);
  }

  const line = lines[idx]!;
  const tokenMatch = line.match(tokenRe)!;
  const indent = line.slice(0, line.length - line.trimStart().length);
  const suffix = line.slice(tokenMatch.index! + tokenMatch[0].length);
  // Non-whitespace text before the marker token on its own line, e.g. the
  // `})` in `}) /* <!-- MARKER --> */;` — discarding this would delete code.
  // On an own-line marker (only whitespace precedes the token) this is "".
  const prefix = line.slice(indent.length, tokenMatch.index!);

  const rendered = bodyLines.map((l) => (l.trim() === "" ? "" : indent + l));
  const firstBodyLine = bodyLines[0];
  if (prefix !== "" && rendered.length > 0 && firstBodyLine !== undefined) {
    rendered[0] = indent + prefix + firstBodyLine;
  }
  const lastIdx = rendered.length - 1;
  if (lastIdx >= 0) rendered[lastIdx] = (rendered[lastIdx] ?? "") + suffix;

  lines.splice(idx, 1, ...rendered);
  writeFileSync(targetPath, lines.join(eol));
  return "spliced";
}

// ── entry point ──────────────────────────────────────────────────────────────

export function applyModule(name: string, root: string): void {
  const moduleDir = join(root, "modules", name);
  if (!existsSync(moduleDir)) {
    throw new Error(`module not found: modules/${name}`);
  }

  copyFiles(moduleDir, root);

  const fragmentsDir = join(moduleDir, "fragments");
  if (existsSync(fragmentsDir)) {
    const depsPath = join(fragmentsDir, "package-deps.md");
    if (existsSync(depsPath)) {
      mergePackageJson(root, parsePackageDeps(readFileSync(depsPath, "utf8")));
    }
    for (const file of readdirSync(fragmentsDir)) {
      if (!file.endsWith(".md") || file === "package-deps.md") continue;
      const md = readFileSync(join(fragmentsDir, file), "utf8");
      for (const dir of parseDirectives(md)) spliceDirective(root, dir);
    }
  }

  // A module that adds routes (persistence brings /signin, /dashboard,
  // /api/auth) changes the route tree Next generates types from. With
  // `typedRoutes: true`, a `.next` built from the PREVIOUS tree makes
  // `tsc --noEmit` reject the very links the module just installed
  // (`Type '"/signin"' is not assignable to RouteImpl<"/signin">`), so the
  // first `pnpm lint` after an install fails on correct code — the exact
  // gate this module's apply plan tells you to run. `.next` is a gitignored
  // cache that the next build/dev regenerates, and we are the ones who
  // invalidated it, so drop it rather than leave a trap.
  const nextCache = join(root, ".next");
  if (existsSync(nextCache))
    rmSync(nextCache, { recursive: true, force: true });
}

// CLI: `tsx scripts/apply-module.ts <name>` applies into the cwd.
if (process.argv[1] && process.argv[1].endsWith("apply-module.ts")) {
  const name = process.argv[2];
  if (!name) {
    console.error("usage: tsx scripts/apply-module.ts <module-name>");
    process.exit(1);
  }
  const root = process.cwd();
  const moduleDir = join(root, "modules", name);
  const copied = existsSync(join(moduleDir, "files"))
    ? walkFiles(join(moduleDir, "files"))
    : [];
  applyModule(name, root);
  console.log(
    `Applied module "${name}": copied ${copied.length} file(s), ` +
      `merged package.json, spliced fragments.`,
  );
}
