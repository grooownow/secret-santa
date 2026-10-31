/**
 * Resolvers for the skill compiler (scripts/gen-skills.ts).
 *
 * A skill's authored source is `SKILL.md.tmpl`; `SKILL.md` is built from it by
 * substituting `{{PLACEHOLDER}}`s. The point is not templating for its own
 * sake — it is that the shared parts of six skills stop being six copies.
 *
 * Before this existed, the "chat in the project's language" rule was written
 * three different ways in three skills, and "never claim green without output"
 * lived in two. That is how a skill suite rots: not by anyone being wrong, but
 * by six copies drifting apart one honest edit at a time.
 *
 * Every resolver reads a source of truth that already exists — CLAUDE.md for
 * the invariants, package.json for the gate commands, docs/rules/ for the rules
 * map. So a skill cannot describe a gate command the repo does not have.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { loadSkillSources } from "./skills";

export interface RepoContext {
  root: string;
}

/** `{{NAME}}` — uppercase, underscore-separated. */
export const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

/**
 * The hard invariants, lifted verbatim from CLAUDE.md's numbered list. Reading
 * them from the file means a skill can never quote a stale invariant, and
 * renumbering them in CLAUDE.md renumbers them everywhere.
 */
export function invariants(ctx: RepoContext): string {
  const claudeMd = readFileSync(path.join(ctx.root, "CLAUDE.md"), "utf8");
  const section = /## Hard invariants[^\n]*\n+([\s\S]*?)\n\n(?=[A-Z]|## )/.exec(
    claudeMd,
  );
  const list = section?.[1]?.trim();
  if (!list) {
    throw new Error(
      "CLAUDE.md: could not find the '## Hard invariants' numbered list",
    );
  }
  return list;
}

/**
 * Every `pnpm <script>` a skill tells the agent to run.
 *
 * The gate sequence is deliberately NOT templated: `verify`'s prose carries
 * detail a generated list would throw away (why the e2e suite boots its own
 * server, what to do when Chromium is missing). Templating it would trade real
 * information for tidiness. The drift risk it leaves behind — a skill happily
 * invoking a script that no longer exists — is closed by a test instead
 * (scripts/gen-skills.test.ts), which is the cheaper half of the same guarantee.
 */
export function referencedPnpmScripts(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(/`pnpm ([a-z][a-z0-9:-]*)/g)) {
    const script = match[1];
    // `pnpm skills:*` in prose is a glob over a family of scripts, not a script.
    if (script && !script.endsWith(":")) found.add(script);
  }
  return [...found].sort();
}

export function packageScripts(ctx: RepoContext): Set<string> {
  const pkg = JSON.parse(
    readFileSync(path.join(ctx.root, "package.json"), "utf8"),
  ) as {
    scripts?: Record<string, string>;
  };
  return new Set(Object.keys(pkg.scripts ?? {}));
}

/** The rules map: one line per docs/rules/*.md, with its own **Applies to:** line. */
export function rulesMap(ctx: RepoContext): string {
  const dir = path.join(ctx.root, "docs", "rules");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const content = readFileSync(path.join(dir, file), "utf8");
      const applies = /\*\*Applies to:\*\*\s*([\s\S]*?)(?:\n\n|$)/.exec(
        content,
      );
      const scope = (applies?.[1] ?? "")
        .replace(/\s+/g, " ")
        .replace(/\s*\(spec §[\d.]+\)/, "")
        .trim();
      // Strict on purpose: a rules file with no scope line is a rules file the
      // agent cannot decide whether to read. That is a bug in the docs, and it
      // should stop the build rather than render as a shrug.
      if (!scope) {
        throw new Error(
          `docs/rules/${file} has no "**Applies to:**" line — every rules file must declare its scope`,
        );
      }
      return `- \`docs/rules/${file}\` — ${scope}`;
    })
    .join("\n");
}

/** The other skills, so a skill can hand off without guessing a name. */
export function skillCatalog(ctx: RepoContext): string {
  return loadSkillSources(path.join(ctx.root, ".claude", "skills"))
    .map((skill) => {
      const firstSentence =
        skill.description.split(/(?<=\.)\s/)[0] ?? skill.description;
      return `- \`${skill.name}\` — ${firstSentence.trim()}`;
    })
    .join("\n");
}

/**
 * The shared prelude, by tier.
 *
 * - **Tier 1** (every skill): how to talk, and the ban on unevidenced claims.
 * - **Tier 2** (skills that touch code): tier 1 + the invariants and the rules map.
 *
 * Tiers exist so `doubt` — which reasons about a decision and writes nothing —
 * doesn't carry the architecture rules in its context for no reason. Context
 * budget is a design constraint, not an afterthought.
 */
export function preamble(ctx: RepoContext, tier: number): string {
  const blocks: string[] = [
    `<!-- Generated from the shared preamble (scripts/lib/codegen.ts). Edit it there, not here. -->

- **Language:** chat with the user in the project's chat language
  (\`docs/manifest.md\` → _Chat language_; falls back to the language of the
  user's messages while unset). Every artifact that lives in the repo — code,
  docs, commit messages — is English.
- **Evidence, not adjectives.** Never report a command as green without quoting
  the line that proves it. "It should pass" is not a result, and the word
  _should_ in a status line is a red flag about your own honesty.`,
  ];

  if (tier >= 2) {
    blocks.push(`- **The hard invariants** (\`CLAUDE.md\`), which a \`PreToolUse\` hook
  (\`scripts/hooks/pretooluse.ts\`) enforces at the moment of the write — do not
  design around them, and do not treat a hook denial as a puzzle to route
  around:

${invariants(ctx)
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}

- **Read the rule that governs the step you are on, at the moment you reach it** —
  not from memory, and not all of them up front:

${rulesMap(ctx)
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}`);
  }

  return blocks.join("\n");
}

export type Resolver = (ctx: RepoContext, skill: { tier: number }) => string;

export const RESOLVERS: Record<string, Resolver> = {
  PREAMBLE: (ctx, skill) => preamble(ctx, skill.tier),
  INVARIANTS: (ctx) => invariants(ctx),
  RULES_MAP: (ctx) => rulesMap(ctx),
  SKILL_CATALOG: (ctx) => skillCatalog(ctx),
};

export const STEPS_DIR = path.join(".claude", "skill-steps");

/**
 * Step fragments: `.claude/skill-steps/<name>.md` → `{{STEP_<NAME>}}`.
 *
 * The preamble above solves "every skill says this"; fragments solve the
 * narrower case that actually bites — a rule that governs *some* skills and is
 * therefore restated by each of them in its own words, until one of the copies
 * quietly stops matching the tooling. `pnpm format` before a commit was written
 * in three skills and missing from the two that commit most often; the retry
 * budget existed in `feature` alone, so every other skill's fix loop was
 * unbounded by omission rather than by decision.
 *
 * A fragment earns its file when more than one skill needs the same rule
 * *verbatim*. Anything a skill states differently because its situation differs
 * (gridfin's non-conventional commit subjects, update's one-commit-per-version)
 * stays in that skill — a fragment that has to be qualified at every call site
 * is worse than the duplication it replaced.
 */
export function stepFragments(ctx: RepoContext): Record<string, string> {
  const dir = path.join(ctx.root, STEPS_DIR);
  if (!existsSync(dir)) return {};

  const out: Record<string, string> = {};
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".md")) continue;
    const stem = path.basename(file, ".md");
    const key = `STEP_${stem.replace(/-/g, "_").toUpperCase()}`;
    if (!/^STEP_[A-Z][A-Z0-9_]*$/.test(key)) {
      throw new Error(
        `${STEPS_DIR}/${file}: name does not make a valid placeholder ({{${key}}}) — use lowercase words separated by hyphens`,
      );
    }
    out[key] = readFileSync(path.join(dir, file), "utf8").trim();
  }
  return out;
}

export const GENERATED_HEADER =
  "<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->";

/** Substitute every placeholder in `template`. Throws on an unknown one. */
export function render(
  template: string,
  ctx: RepoContext,
  skill: { name: string; tier: number },
): string {
  const fragments = stepFragments(ctx);
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const resolver = RESOLVERS[name];
    if (resolver) return resolver(ctx, skill);

    const fragment = fragments[name];
    if (fragment !== undefined) return fragment;

    const known = [...Object.keys(RESOLVERS), ...Object.keys(fragments)];
    throw new Error(
      `${skill.name}: unknown placeholder {{${name}}}. Known: ${known.join(", ")}`,
    );
  });
}
