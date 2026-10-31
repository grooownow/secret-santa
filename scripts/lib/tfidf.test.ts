import { describe, expect, it } from "vitest";

import { buildCorpus, cosine, rankSkills, stem, tokenize } from "./tfidf";

describe("stem", () => {
  it("strips the -ing, -ed, -ly, -es and -s suffixes", () => {
    expect(stem("reviewing")).toBe("review");
    expect(stem("verified")).toBe("verifi");
    expect(stem("quickly")).toBe("quick");
    expect(stem("branches")).toBe("branch");
    expect(stem("reviews")).toBe("review");
  });

  it("leaves short tokens and -ss endings alone", () => {
    expect(stem("has")).toBe("has");
    expect(stem("pass")).toBe("pass");
  });
});

describe("tokenize", () => {
  it("lowercases, splits on non-alphanumerics, drops stopwords and short tokens", () => {
    expect(tokenize("Use WHEN the diff is ready!")).toEqual(["diff", "ready"]);
  });
});

describe("cosine", () => {
  it("is 1 for a vector against itself and 0 for disjoint vectors", () => {
    const a = new Map([
      ["x", 1],
      ["y", 2],
    ]);
    const b = new Map([["z", 3]]);
    expect(cosine(a, a)).toBeCloseTo(1);
    expect(cosine(a, b)).toBe(0);
  });

  it("is 0 when either vector is empty", () => {
    expect(cosine(new Map(), new Map([["x", 1]]))).toBe(0);
  });
});

describe("rankSkills", () => {
  const corpus = buildCorpus([
    { name: "verify", text: "runs the quality gate sequence lint test build" },
    { name: "review", text: "adversarial review of the current diff findings" },
    { name: "deploy", text: "ships the project to production on vercel" },
  ]);

  it("ranks the skill whose description shares the prompt's vocabulary first", () => {
    expect(rankSkills("run the gate sequence", corpus)[0]).toBe("verify");
    expect(rankSkills("review this diff", corpus)[0]).toBe("review");
  });

  it("returns every skill, so a caller can read a rank for any of them", () => {
    expect(rankSkills("review this diff", corpus)).toHaveLength(3);
  });

  it("breaks score ties by name, so ranking is deterministic", () => {
    // A prompt sharing nothing with any description scores 0 everywhere.
    expect(rankSkills("zzzz qqqq", corpus)).toEqual([
      "deploy",
      "review",
      "verify",
    ]);
  });
});
