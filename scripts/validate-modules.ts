import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_KEYS = ["name", "description", "depends-on", "presets"] as const;

function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  const lines = m[1]!.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i]!.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2]!.trim();
    // A key with an empty value may be a block-style YAML sequence:
    //   presets:
    //     - App
    // Treat it as present/non-empty when followed by "  - item" lines.
    if (value === "") {
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+\S/.test(lines[j]!)) j++;
      if (j > i + 1) value = "[block sequence]";
    }
    out[kv[1]!] = value;
  }
  return out;
}

export function validateModules(
  root: string,
): { name: string; errors: string[] }[] {
  const dir = join(root, "modules");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .map((name) => {
      const errors: string[] = [];
      const mdPath = join(dir, name, "module.md");
      if (!existsSync(mdPath)) {
        return { name, errors: ["missing module.md"] };
      }
      const md = readFileSync(mdPath, "utf8");
      const fm = parseFrontmatter(md);
      for (const k of REQUIRED_KEYS) {
        if (!(k in fm)) errors.push(`missing frontmatter key: ${k}`);
      }
      if ("presets" in fm && (fm.presets === "" || fm.presets === "[]")) {
        errors.push("presets must be non-empty");
      }
      if (!/^##\s+Apply plan\s*$/m.test(md)) {
        errors.push("missing '## Apply plan' section");
      }
      return { name, errors };
    });
}

// CLI: exit non-zero if any module is invalid.
if (process.argv[1] && process.argv[1].endsWith("validate-modules.ts")) {
  const results = validateModules(process.cwd());
  const bad = results.filter((r) => r.errors.length > 0);
  for (const r of bad) {
    console.error(`✗ modules/${r.name}: ${r.errors.join("; ")}`);
  }
  console.log(`Validated ${results.length} module(s); ${bad.length} invalid.`);
  process.exit(bad.length === 0 ? 0 : 1);
}
