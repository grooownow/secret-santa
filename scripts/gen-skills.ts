#!/usr/bin/env tsx
/**
 * The skill compiler: SKILL.md.tmpl → SKILL.md.
 *
 * `pnpm skills:gen` writes the generated files. `pnpm skills:check` writes
 * nothing and exits non-zero if any is stale — that is the CI gate, and it is
 * the whole reason the compiler is trustworthy. Without it, a hand-edit to
 * SKILL.md would survive until the next unrelated regeneration silently
 * reverted it.
 *
 * The output is run through prettier before it is written. Not cosmetics: the
 * repo's `prettier --check` gate covers every markdown file, so unformatted
 * output would be rewritten by `pnpm format` the moment anyone ran it — and the
 * generated file would then read as "stale" against its own template forever.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { format, resolveConfig } from "prettier";

import { GENERATED_HEADER, render, type RepoContext } from "./lib/codegen";
import { loadSkillSources, SKILLS_DIR } from "./lib/skills";

const check = process.argv.includes("--check");
const ctx: RepoContext = { root: process.cwd() };

/**
 * The generated header goes *after* the frontmatter, not before it: the agent
 * runtime parses frontmatter from the first line, and a comment above `---`
 * would make the file unparseable.
 */
async function compile(
  template: string,
  skill: { name: string; tier: number },
  prettierConfig: Awaited<ReturnType<typeof resolveConfig>>,
): Promise<string> {
  const rendered = render(template, ctx, skill);
  const match = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/.exec(rendered);
  if (!match) {
    throw new Error(`${skill.name}: SKILL.md.tmpl has no frontmatter block`);
  }
  const withHeader = `${match[1]}\n${GENERATED_HEADER}\n${match[2]}`;
  return format(withHeader, { ...prettierConfig, parser: "markdown" });
}

async function main(): Promise<void> {
  const prettierConfig = await resolveConfig(
    path.join(ctx.root, "package.json"),
  );
  let stale = 0;

  for (const source of loadSkillSources(SKILLS_DIR)) {
    const outPath = path.join(path.dirname(source.file), "SKILL.md");
    const next = await compile(
      readFileSync(source.file, "utf8"),
      source,
      prettierConfig,
    );

    let current: string | null = null;
    try {
      current = readFileSync(outPath, "utf8");
    } catch {
      current = null;
    }

    if (current === next) continue;

    if (check) {
      stale += 1;
      console.error(
        `✗ ${path.relative(ctx.root, outPath)} is ${current === null ? "missing" : "stale"}`,
      );
    } else {
      writeFileSync(outPath, next);
      console.log(`✓ ${path.relative(ctx.root, outPath)}`);
    }
  }

  if (!check) {
    console.log(
      "\nSkills compiled. Commit both the .tmpl and the generated SKILL.md.",
    );
    return;
  }

  if (stale > 0) {
    console.error(
      `\n${stale} generated skill file(s) out of date. Run \`pnpm skills:gen\` and commit the result.\n` +
        `(SKILL.md is compiled from SKILL.md.tmpl — edit the template, never the output.)`,
    );
    process.exit(1);
  }
  console.log("✓ every SKILL.md matches its template");
}

void main();
