#!/usr/bin/env tsx
/**
 * Tier 1 of the skill eval harness: structural validation.
 *
 * Cheap, deterministic, runs in CI on every push. It cannot tell whether a
 * skill is *good* — only that it is well-formed enough for the agent runtime
 * to load it and for a human to review it. Tier 2 (scripts/skill-evals.ts)
 * checks that descriptions route; Tier 3 checks that behavior follows.
 */
import type { Skill } from "./lib/skills";
import { loadSkills } from "./lib/skills";

const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_BODY_LINES = 500;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The description is injected into the agent's system prompt, and it is the
 * only thing the agent sees before deciding to load the skill. Without a
 * trigger clause it says what the skill does but never when to reach for it.
 */
const TRIGGER_CLAUSE = /\buse (this )?(skill )?(when|before|after|during)\b/i;

/** Matches the `` `name` skill `` convention used across Gridfin's skills. */
const SKILL_REFERENCE = /`([a-z][a-z0-9-]*)`\s+skill\b/g;

/** Cyrillic specifically — NOT any non-ASCII. Em-dashes, curly quotes, and the
 *  CJK/accented language-menu entries are legitimate; stray Russian is not. */
const CYRILLIC = /[Ѐ-ӿ]/;

/** A body line carrying this marker may hold Cyrillic (the language picker). */
const ALLOW_NONASCII = "<!-- allow-nonascii -->";

/** Required sections are passed in, not hardcoded, so a later task can tighten them. */
export function validateSkill(
  skill: Skill,
  knownSkillNames: Set<string>,
  requiredSections: string[],
): string[] {
  const errors: string[] = [];
  const at = `${skill.dir}/SKILL.md`;

  if (!skill.name) {
    errors.push(`${at}: frontmatter 'name' is missing`);
  } else {
    if (!KEBAB_CASE.test(skill.name)) {
      errors.push(`${at}: name '${skill.name}' is not kebab-case`);
    }
    if (skill.name !== skill.dir) {
      errors.push(
        `${at}: name '${skill.name}' does not match directory '${skill.dir}'`,
      );
    }
  }

  if (!skill.description) {
    errors.push(`${at}: frontmatter 'description' is missing`);
  } else {
    if (skill.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `${at}: description is ${skill.description.length} characters, over the ${MAX_DESCRIPTION_LENGTH} limit`,
      );
    }
    if (!TRIGGER_CLAUSE.test(skill.description)) {
      errors.push(
        `${at}: description has no trigger clause ("Use when …") — the agent cannot tell when to load it`,
      );
    }
    if (CYRILLIC.test(skill.description)) {
      errors.push(
        `${at}: description contains Cyrillic — skill artifacts are English`,
      );
    }
  }

  skill.body.split("\n").forEach((line, index) => {
    if (CYRILLIC.test(line) && !line.includes(ALLOW_NONASCII)) {
      errors.push(
        `${at}:${index + 1}: body line contains Cyrillic — skill artifacts are English (mark a deliberate exception with ${ALLOW_NONASCII})`,
      );
    }
  });

  const lineCount = skill.body.split("\n").length;
  if (lineCount > MAX_BODY_LINES) {
    errors.push(
      `${at}: body is ${lineCount} lines, over the ${MAX_BODY_LINES} lines budget — move reference material into references/`,
    );
  }

  for (const section of requiredSections) {
    if (!skill.body.includes(section)) {
      errors.push(`${at}: missing required section '${section}'`);
    }
  }

  for (const match of skill.body.matchAll(SKILL_REFERENCE)) {
    const referenced = match[1];
    if (referenced && !knownSkillNames.has(referenced)) {
      errors.push(`${at}: references unknown skill '${referenced}'`);
    }
  }

  return errors;
}

/**
 * Every skill carries an anti-rationalization table. It is the section that
 * most reliably changes agent behavior: it names the excuse and rebuts it
 * before the agent reaches for it.
 */
export const REQUIRED_SECTIONS: string[] = ["## Common rationalizations"];

function main(): void {
  const skills = loadSkills();
  const known = new Set(skills.map((s) => s.name).filter(Boolean));

  const errors = skills.flatMap((skill) =>
    validateSkill(skill, known, REQUIRED_SECTIONS),
  );

  if (errors.length > 0) {
    for (const error of errors) console.error(`✗ ${error}`);
    console.error(`\n${errors.length} problem(s) in ${skills.length} skill(s)`);
    process.exit(1);
  }

  console.log(`✓ ${skills.length} skills valid`);
}

if (process.argv[1]?.endsWith("validate-skills.ts")) main();
