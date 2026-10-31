import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkLocale,
  collectLeaves,
  hashText,
  runChecks,
  type Issue,
  type LocaleTree,
  type Schema,
} from "./i18n-check";

const schema: Schema = {
  locales: {
    en: { source: null, role: "human" },
    de: { source: "en", role: "mt" },
  },
  budgets: {
    "seo.title": { max: 20, perLocale: { de: { max: 10 } } },
    "seo.description": { min: 15, max: 200 },
  },
  keys: ["seo.title", "seo.description", "hero.h1", "footer.text"],
};

const glossary = ["Gridfin", "Claude Code"];

const en: LocaleTree = {
  _meta: { locale: "en", source: null },
  seo: {
    title: { text: "Gridfin starter" },
    description: { text: "Gridfin for Claude Code." },
  },
  hero: { h1: { text: "Ship it with Claude Code" } },
  footer: { text: { text: "Write to [email] · code on [github]" } },
};

/** A correct translation of `en` — every check should pass on this pair. */
function cleanDe(): LocaleTree {
  const leaf = (source: { text: string }, text: string) => ({
    text,
    from: hashText(source.text),
    status: "mt",
  });
  const src = collectLeaves(en);
  return {
    _meta: { locale: "de", source: "en" },
    seo: {
      title: leaf(src.get("seo.title")!, "GridfinKit"),
      description: leaf(
        src.get("seo.description")!,
        "Gridfin für Claude Code.",
      ),
    },
    hero: { h1: leaf(src.get("hero.h1")!, "Mit Claude Code ausliefern") },
    footer: {
      text: leaf(
        src.get("footer.text")!,
        "Schreib an [email] · Code auf [github]",
      ),
    },
  };
}

function kinds(issues: Issue[]): string[] {
  return issues.map((issue) => issue.kind);
}

describe("hashText", () => {
  it("is a stable 12-hex fingerprint", () => {
    expect(hashText("abc")).toMatch(/^[0-9a-f]{12}$/);
    expect(hashText("abc")).toBe(hashText("abc"));
    expect(hashText("abc")).not.toBe(hashText("abd"));
  });
});

describe("checkLocale — structure", () => {
  it("passes a clean source locale", () => {
    expect(checkLocale(schema, glossary, "en", en)).toEqual([]);
  });

  it("passes a clean translation", () => {
    expect(checkLocale(schema, glossary, "de", cleanDe(), en)).toEqual([]);
  });

  it("flags a missing key", () => {
    const broken = structuredClone(en) as LocaleTree & { hero?: unknown };
    delete broken.hero;
    expect(kinds(checkLocale(schema, glossary, "en", broken))).toContain(
      "missing-key",
    );
  });

  it("flags a key that is not in the schema", () => {
    const broken = structuredClone(en) as LocaleTree;
    (broken as Record<string, unknown>).rogue = { text: "surprise" };
    expect(kinds(checkLocale(schema, glossary, "en", broken))).toContain(
      "extra-key",
    );
  });

  it("flags an empty string", () => {
    const broken = structuredClone(en) as {
      hero: { h1: { text: string } };
    } & LocaleTree;
    broken.hero.h1.text = "   ";
    expect(kinds(checkLocale(schema, glossary, "en", broken))).toContain(
      "empty",
    );
  });
});

describe("checkLocale — budgets", () => {
  it("flags text over the base budget", () => {
    const broken = structuredClone(en) as {
      seo: { title: { text: string } };
    } & LocaleTree;
    broken.seo.title.text = "x".repeat(21);
    expect(kinds(checkLocale(schema, glossary, "en", broken))).toContain(
      "over-budget",
    );
  });

  it("flags text under the minimum budget", () => {
    const broken = structuredClone(en) as {
      seo: { description: { text: string } };
    } & LocaleTree;
    broken.seo.description.text = "too short";
    expect(kinds(checkLocale(schema, glossary, "en", broken))).toContain(
      "under-budget",
    );
  });

  it("applies the per-locale override (de title max 10, not 20)", () => {
    const de = cleanDe() as { seo: { title: Leaf } } & LocaleTree;
    de.seo.title.text = "Gridfin Set!"; // 12 chars: fine for en's 20, over de's 10
    const issues = checkLocale(schema, glossary, "de", de, en);
    expect(kinds(issues)).toContain("over-budget");
  });
});

interface Leaf {
  text: string;
  from?: string;
  status?: string;
}

describe("checkLocale — translation fidelity", () => {
  it("flags a stale translation when the source string changed", () => {
    const de = cleanDe() as { hero: { h1: Leaf } } & LocaleTree;
    de.hero.h1.from = hashText("an older english string");
    expect(kinds(checkLocale(schema, glossary, "de", de, en))).toContain(
      "stale",
    );
  });

  it("flags a translated leaf without a `from` hash", () => {
    const de = cleanDe() as { hero: { h1: Leaf } } & LocaleTree;
    delete de.hero.h1.from;
    expect(kinds(checkLocale(schema, glossary, "de", de, en))).toContain(
      "missing-from",
    );
  });

  it("flags an invalid status", () => {
    const de = cleanDe() as { hero: { h1: Leaf } } & LocaleTree;
    de.hero.h1.status = "guessed";
    expect(kinds(checkLocale(schema, glossary, "de", de, en))).toContain(
      "bad-status",
    );
  });

  it("flags a dropped placeholder", () => {
    const de = cleanDe() as { footer: { text: Leaf } } & LocaleTree;
    de.footer.text.text = "Schreib mir einfach eine Mail";
    expect(kinds(checkLocale(schema, glossary, "de", de, en))).toContain(
      "placeholder-mismatch",
    );
  });

  it("flags a translated glossary term", () => {
    const de = cleanDe() as { seo: { description: Leaf } } & LocaleTree;
    de.seo.description.text = "Gitterflosse für Klaude Kode."; // both terms mangled
    const issues = checkLocale(schema, glossary, "de", de, en).filter(
      (issue) => issue.kind === "glossary",
    );
    expect(issues).toHaveLength(2);
  });
});

describe("runChecks", () => {
  it("flags a locale that schema.json does not declare", () => {
    const files = new Map<string, LocaleTree>([["xx", en]]);
    expect(kinds(runChecks(schema, glossary, files))).toContain("file");
  });

  it("flags a translation whose source file is absent", () => {
    const files = new Map<string, LocaleTree>([["de", cleanDe()]]);
    expect(kinds(runChecks(schema, glossary, files))).toContain("file");
  });
});

describe("real landing content", () => {
  const contentDir = path.join(__dirname, "..", "content");
  const read = (name: string) =>
    JSON.parse(readFileSync(path.join(contentDir, name), "utf8")) as never;

  it("en.json and ru.json pass every check against the real schema", () => {
    const realSchema = read("schema.json") as Schema;
    const terms = (read("glossary.json") as { terms: string[] }).terms;
    const files = new Map<string, LocaleTree>([
      ["en", read("en.json")],
      ["ru", read("ru.json")],
    ]);
    expect(runChecks(realSchema, terms, files)).toEqual([]);
  });
});
