import { describe, it, expect, beforeEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyModule, parseDirectives } from "./apply-module";

/**
 * Build a self-contained scratch project in a temp dir with a tiny `demo`
 * module and a target file that carries a splice marker. Nothing here touches
 * the real repo tree.
 */
function makeScratch(): { root: string } {
  const root = mkdtempSync(join(tmpdir(), "apply-module-"));

  // A minimal root package.json (2-space, trailing newline).
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "scratch",
        dependencies: { zod: "^4.0.0" },
        devDependencies: {},
        scripts: { build: "next build" },
      },
      null,
      2,
    ) + "\n",
  );

  // Module: modules/demo/files/greet.ts
  const moduleDir = join(root, "modules", "demo");
  mkdirSync(join(moduleDir, "files"), { recursive: true });
  mkdirSync(join(moduleDir, "fragments"), { recursive: true });
  writeFileSync(
    join(moduleDir, "files", "greet.ts"),
    'export const greet = () => "hi";\n',
  );

  // module.md (validator + convention).
  writeFileSync(
    join(moduleDir, "module.md"),
    "---\nname: demo\ndescription: d\ndepends-on: []\npresets: [App]\n---\n\n# demo\n\n## Apply plan\n\nx\n",
  );

  // package-deps.md — one dep, one devDep, one script.
  writeFileSync(
    join(moduleDir, "fragments", "package-deps.md"),
    [
      "# Fragment: package-deps",
      "",
      "## dependencies",
      "",
      "```json",
      '"left-pad": "^1.3.0"',
      "```",
      "",
      "## devDependencies",
      "",
      "```json",
      '"tiny-dev": "^2.0.0"',
      "```",
      "",
      "## scripts",
      "",
      "```json",
      '"greet": "tsx greet.ts"',
      "```",
      "",
    ].join("\n"),
  );

  // A splice fragment targeting a scratch file that contains the marker.
  writeFileSync(
    join(moduleDir, "fragments", "hook.md"),
    [
      "# Fragment: hook",
      "",
      '<!-- apply target="src/target.ts" marker="demo:hook" -->',
      "",
      "```ts",
      "const injected = 1;",
      "```",
      "",
    ].join("\n"),
  );

  // Target file with the marker line (own line, indented).
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "target.ts"),
    "function f() {\n  // <!-- demo:hook -->\n}\n",
  );

  return { root };
}

describe("applyModule", () => {
  let root: string;

  beforeEach(() => {
    root = makeScratch().root;
  });

  // A module that adds routes (persistence brings /signin, /dashboard,
  // /api/auth) invalidates Next's generated route types. With `typedRoutes`
  // on, a `.next` left over from a build of the PREVIOUS route tree makes
  // `tsc --noEmit` reject the very links the module just installed
  // (`Type '"/signin"' is not assignable to RouteImpl<"/signin">`) — so the
  // buyer's first `pnpm lint` after an install fails on correct code. Proven
  // on a real export: stale `.next` → tsc errors; no `.next` → tsc clean.
  // The applier owns this: it invalidated the cache, so it removes it.
  it("removes a stale .next build cache it invalidated", () => {
    mkdirSync(join(root, ".next", "types"), { recursive: true });
    writeFileSync(join(root, ".next", "types", "routes.d.ts"), "// stale\n");

    applyModule("demo", root);

    expect(existsSync(join(root, ".next"))).toBe(false);
  });

  it("applies cleanly when there is no .next cache", () => {
    expect(existsSync(join(root, ".next"))).toBe(false);
    applyModule("demo", root);
    expect(existsSync(join(root, "greet.ts"))).toBe(true);
  });

  it("copies files, merges deps/scripts, splices markers, and is idempotent", () => {
    applyModule("demo", root);

    // (a) files/greet.ts copied to root/greet.ts
    expect(existsSync(join(root, "greet.ts"))).toBe(true);
    expect(readFileSync(join(root, "greet.ts"), "utf8")).toContain(
      "export const greet",
    );

    // (b) package.json gained the dep, devDep, and script (union, kept existing)
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(pkg.dependencies["left-pad"]).toBe("^1.3.0");
    expect(pkg.dependencies["zod"]).toBe("^4.0.0"); // untouched existing
    expect(pkg.devDependencies["tiny-dev"]).toBe("^2.0.0");
    expect(pkg.scripts["greet"]).toBe("tsx greet.ts");
    expect(pkg.scripts["build"]).toBe("next build"); // untouched existing

    // (c) marker target got the code spliced, indentation preserved
    const target = readFileSync(join(root, "src", "target.ts"), "utf8");
    expect(target).toContain("  const injected = 1;");
    expect(target).not.toContain("<!-- demo:hook -->");

    // (d) second apply is a no-op (identical content, no double-splice)
    const before = readFileSync(join(root, "src", "target.ts"), "utf8");
    const pkgBefore = readFileSync(join(root, "package.json"), "utf8");
    applyModule("demo", root);
    expect(readFileSync(join(root, "src", "target.ts"), "utf8")).toBe(before);
    expect(readFileSync(join(root, "package.json"), "utf8")).toBe(pkgBefore);
    // exactly one injection
    expect(before.match(/const injected = 1;/g)).toHaveLength(1);
  });

  it("throws a clear error when a declared marker is missing", () => {
    // Overwrite the target so the marker is gone AND the body is absent.
    writeFileSync(join(root, "src", "target.ts"), "function f() {}\n");
    expect(() => applyModule("demo", root)).toThrow(/marker "demo:hook"/);
  });

  it("preserves a trailing semicolon after the spliced block", () => {
    // Marker sharing a line with a trailing `;` (the env-refine shape).
    writeFileSync(
      join(root, "modules", "demo", "fragments", "hook.md"),
      [
        "# Fragment: hook",
        "",
        '<!-- apply target="src/refine.ts" marker="demo:refine" -->',
        "",
        "```ts",
        ".chain(() => {",
        "  return 1;",
        "})",
        "```",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(root, "src", "refine.ts"),
      "const x = base\n  /* <!-- demo:refine --> */;\n",
    );

    applyModule("demo", root);
    const out = readFileSync(join(root, "src", "refine.ts"), "utf8");
    expect(out).toContain("  .chain(() => {");
    expect(out).toContain("  });"); // semicolon re-attached to the last line
    expect(out).not.toContain("<!-- demo:refine -->");

    // idempotent even with the re-attached `;`
    const before = out;
    applyModule("demo", root);
    expect(readFileSync(join(root, "src", "refine.ts"), "utf8")).toBe(before);
  });

  it("preserves a non-whitespace prefix on an inline marker line", () => {
    // Marker sharing a line with code BEFORE the token, e.g. `})` closing a
    // z.object({...}) call — that prefix must survive the splice, not be
    // silently deleted along with the marker line.
    writeFileSync(
      join(root, "modules", "demo", "fragments", "hook.md"),
      [
        "# Fragment: hook",
        "",
        '<!-- apply target="src/inline.ts" marker="demo:inline" -->',
        "",
        "```ts",
        ".foo((x) => { return x; })",
        "```",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(root, "src", "inline.ts"),
      "const x = base\n}) /* <!-- demo:inline --> */;\n",
    );

    applyModule("demo", root);
    const out = readFileSync(join(root, "src", "inline.ts"), "utf8");
    expect(out).toContain("}).foo((x) => { return x; });");
    expect(out).not.toContain("<!-- demo:inline -->");

    // idempotent
    const before = out;
    applyModule("demo", root);
    expect(readFileSync(join(root, "src", "inline.ts"), "utf8")).toBe(before);
  });

  it("re-injects the persistence layer by file copy + package merge, not splices", () => {
    // Task 5 (the Landing inversion) settled on file-overwrite over marker
    // splices for src/lib/env.ts, src/app/page.tsx and playwright.config.ts:
    // prettier and the unused-import lint make in-place splicing of those
    // files unreliable, so the module OWNS full copies under files/ instead.
    // The module therefore carries no `<!-- apply ... -->` splice directives;
    // its only package.json touch is the deps/scripts merge.
    const fragmentsDir = join(process.cwd(), "modules/persistence/fragments");
    const directives = readdirSync(fragmentsDir)
      .filter((f) => f.endsWith(".md") && f !== "package-deps.md")
      .flatMap((f) =>
        parseDirectives(readFileSync(join(fragmentsDir, f), "utf8")),
      );
    expect(directives).toEqual([]);
  });
});
