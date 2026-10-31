import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  GENERATED_HEADER,
  invariants,
  packageScripts,
  preamble,
  referencedPnpmScripts,
  render,
  rulesMap,
  skillCatalog,
  stepFragments,
  type RepoContext,
} from "./lib/codegen";
import { loadSkills, loadSkillSources, SKILLS_DIR } from "./lib/skills";

const ctx: RepoContext = { root: process.cwd() };

describe("resolvers read a real source of truth", () => {
  it("lifts the invariants out of CLAUDE.md, not out of memory", () => {
    const text = invariants(ctx);
    expect(text).toMatch(/^1\. /);
    expect(text).toContain("`<Link>`");
    expect(text).toContain("src/middleware.ts");
    // Six invariants today; the point is that the count comes from the file.
    expect(text.match(/^\d+\. /gm)?.length).toBe(6);
  });

  it("builds the rules map from the files that actually exist", () => {
    const map = rulesMap(ctx);
    expect(map).toContain("docs/rules/architecture.md");
    expect(map).toContain("docs/rules/testing.md");
    expect(map).not.toContain("(no scope line)");
  });

  it("names every skill in the catalog", () => {
    const catalog = skillCatalog(ctx);
    for (const skill of loadSkillSources(SKILLS_DIR)) {
      expect(catalog).toContain(`\`${skill.name}\``);
    }
  });
});

describe("the preamble is tiered so context isn't spent for nothing", () => {
  it("gives every skill the language and evidence rules", () => {
    const tier1 = preamble(ctx, 1);
    expect(tier1).toContain("Chat language");
    expect(tier1).toContain("Evidence, not adjectives");
  });

  it("withholds the invariants and rules map from tier 1", () => {
    const tier1 = preamble(ctx, 1);
    expect(tier1).not.toContain("docs/rules/architecture.md");
    expect(tier1).not.toContain("hard invariants");
  });

  it("gives code-touching skills the invariants and the rules map", () => {
    const tier2 = preamble(ctx, 2);
    expect(tier2).toContain("hard invariants");
    expect(tier2).toContain("docs/rules/architecture.md");
    expect(tier2).toContain("scripts/hooks/pretooluse.ts");
  });
});

describe("step fragments", () => {
  it("exposes every .claude/skill-steps file as a {{STEP_*}} placeholder", () => {
    const fragments = stepFragments(ctx);
    expect(Object.keys(fragments).length).toBeGreaterThan(0);
    for (const [key, body] of Object.entries(fragments)) {
      expect(key, `${key} is not a valid placeholder name`).toMatch(
        /^STEP_[A-Z][A-Z0-9_]*$/,
      );
      expect(body.trim(), `${key} is empty`).not.toBe("");
    }
  });

  it("substitutes a fragment into a template", () => {
    const [key] = Object.keys(stepFragments(ctx));
    const out = render(`x {{${key}}} y`, ctx, { name: "t", tier: 1 });
    expect(out).not.toContain("{{");
    expect(out.length).toBeGreaterThan(4);
  });

  /**
   * A fragment exists to stop two skills from drifting apart. One that no
   * skill references is not shared text — it is a file nobody reads that still
   * has to be kept true, which is the exact debt the fragments were meant to
   * remove. Delete it or use it.
   */
  it("has no fragment that no skill references", () => {
    const sources = loadSkillSources(SKILLS_DIR);
    const unused = Object.keys(stepFragments(ctx)).filter(
      (key) => !sources.some((skill) => skill.body.includes(`{{${key}}}`)),
    );
    expect(
      unused,
      `unreferenced step fragments (delete them or use them): ${unused.join(", ")}`,
    ).toEqual([]);
  });
});

describe("render", () => {
  it("substitutes a known placeholder", () => {
    const out = render("a {{INVARIANTS}} b", ctx, { name: "t", tier: 1 });
    expect(out).toContain("`<Link>`");
  });

  it("throws on a placeholder nobody resolves, naming the known ones", () => {
    expect(() => render("{{NOPE}}", ctx, { name: "t", tier: 1 })).toThrow(
      /unknown placeholder/i,
    );
    expect(() => render("{{NOPE}}", ctx, { name: "t", tier: 1 })).toThrow(
      /PREAMBLE/,
    );
  });
});

describe("the compiled skills are in sync with their templates", () => {
  it("every skill dir has a template and a generated SKILL.md carrying the header", () => {
    const sources = loadSkillSources(SKILLS_DIR);
    expect(sources.length).toBeGreaterThan(0);
    for (const skill of loadSkills(SKILLS_DIR)) {
      const generated = readFileSync(skill.file, "utf8");
      expect(
        generated,
        `${skill.dir}/SKILL.md has no generated header`,
      ).toContain(GENERATED_HEADER);
    }
  });

  it("`pnpm skills:check` passes — no generated file is stale", () => {
    // The real gate. If this fails, someone edited SKILL.md by hand: run
    // `pnpm skills:gen`, and move the edit into SKILL.md.tmpl.
    expect(() =>
      execFileSync(
        "pnpm",
        ["exec", "tsx", "scripts/gen-skills.ts", "--check"],
        {
          cwd: ctx.root,
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });

  it("no template still carries a placeholder the compiler left behind", () => {
    for (const skill of loadSkills(SKILLS_DIR)) {
      const generated = readFileSync(skill.file, "utf8");
      expect(
        generated,
        `${skill.dir}/SKILL.md still contains {{…}}`,
      ).not.toMatch(/\{\{[A-Z][A-Z0-9_]*\}\}/);
    }
  });
});

/**
 * The gate sequence in `verify` is prose, not a generated list — the prose
 * carries detail a list would lose. This is the other half of that trade: the
 * skill may describe a command however it likes, but the command has to exist.
 */
describe("every pnpm script a skill tells the agent to run actually exists", () => {
  it("finds no command that package.json cannot run", () => {
    const known = new Set(packageScripts(ctx));
    const unknown: string[] = [];

    for (const skill of loadSkillSources(SKILLS_DIR)) {
      for (const script of referencedPnpmScripts(skill.body)) {
        // `pnpm exec …`, `pnpm dlx …` and `pnpm install` are pnpm's own verbs,
        // not scripts in this package.
        if (["exec", "dlx", "install", "add", "format"].includes(script))
          continue;
        if (!known.has(script)) unknown.push(`${skill.dir}: pnpm ${script}`);
      }
    }

    expect(
      unknown,
      `skills reference pnpm scripts that do not exist:\n${unknown.join("\n")}`,
    ).toEqual([]);
  });

  it("actually detects a bogus command (proving the test can fail)", () => {
    const known = packageScripts(ctx);
    const found = referencedPnpmScripts(
      "run `pnpm nonexistent:script` to do the thing",
    );
    expect(found).toContain("nonexistent:script");
    expect(known.has("nonexistent:script")).toBe(false);
  });
});

describe("templates are the authored source", () => {
  it("refuses to load a skill dir that has no template", () => {
    expect(() => loadSkillSources(path.join(ctx.root, "docs"))).toThrow(
      /SKILL\.md\.tmpl missing/,
    );
  });
});
