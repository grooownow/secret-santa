import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const SKILLS_DIR = path.join(process.cwd(), ".claude", "skills");

export interface Skill {
  /** The `name:` frontmatter field. Empty string when absent. */
  name: string;
  /** The directory name under .claude/skills/. Always present. */
  dir: string;
  description: string;
  body: string;
  /** Absolute path to SKILL.md, for error messages. */
  file: string;
}

/**
 * A two-field YAML reader, not a YAML parser. Skill frontmatter is a flat
 * `key: value` map with single-line values, and adding a YAML dependency to
 * read it would cost more than it buys.
 */
export function parseFrontmatter(content: string): {
  fields: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (!match) return { fields: {}, body: content };

  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const pair = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    const key = pair?.[1];
    if (key) fields[key] = (pair?.[2] ?? "").trim();
  }

  return { fields, body: match[2] ?? "" };
}

/** A skill's *authored* source: SKILL.md.tmpl, before placeholders are resolved. */
export interface SkillSource extends Skill {
  /** `preamble-tier` frontmatter: 1 = every skill, 2 = skills that touch code. */
  tier: number;
}

/**
 * Loads the templates, not the generated output. The compiler and every check
 * that asks "what did a human actually write?" must read these — reading
 * SKILL.md instead would make a drifted generated file look authoritative.
 */
export function loadSkillSources(dir: string = SKILLS_DIR): SkillSource[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = path.join(dir, entry.name, "SKILL.md.tmpl");
      if (!existsSync(file)) {
        throw new Error(
          `${entry.name}: SKILL.md.tmpl missing at ${file}. SKILL.md is generated — ` +
            `author the template, then run \`pnpm skills:gen\`.`,
        );
      }
      const { fields, body } = parseFrontmatter(readFileSync(file, "utf8"));
      const tier = Number(fields["preamble-tier"] ?? "1");
      return {
        name: fields.name ?? "",
        dir: entry.name,
        description: fields.description ?? "",
        tier: Number.isFinite(tier) ? tier : 1,
        body,
        file,
      };
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

export function loadSkills(dir: string = SKILLS_DIR): Skill[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = path.join(dir, entry.name, "SKILL.md");
      if (!existsSync(file)) {
        throw new Error(`${entry.name}: SKILL.md missing at ${file}`);
      }
      const { fields, body } = parseFrontmatter(readFileSync(file, "utf8"));
      return {
        name: fields.name ?? "",
        dir: entry.name,
        description: fields.description ?? "",
        body,
        file,
      };
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}
