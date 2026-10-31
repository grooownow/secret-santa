/**
 * Tests for the taste profile.
 *
 * The one property that has to be *proven* rather than asserted-by-comment is
 * decay: a preferences store that claims to fade but does not is strictly worse
 * than one that never claimed to, because the user stops watching it. Proving it
 * is only possible because no function below the IO boundary reads the clock —
 * every test here fast-forwards `now` by an argument instead of sleeping a week,
 * and each of them fails if the exponent is dropped or the retention constant is
 * quietly set to 1.
 */
import { describe, expect, it } from "vitest";

import {
  compact,
  decayFactor,
  emptyProfile,
  load,
  NEGLIGIBLE_WEIGHT,
  parse,
  preferences,
  record,
  serialize,
  traitWeights,
  TASTE_FILE,
  TASTE_VERSION,
  WEEK_MS,
  WEEKLY_RETENTION,
  type TasteIO,
  type TasteProfile,
  type TasteSignal,
} from "./taste";

/** A fixed instant, so every expectation below is arithmetic and not a race. */
const T0 = Date.parse("2026-07-12T00:00:00.000Z");

function signal(over: Partial<TasteSignal> = {}): TasteSignal {
  return {
    trait: "dense-tables",
    verdict: "approved",
    weight: 1,
    surface: "dashboard",
    note: "I can see more rows without scrolling",
    at: new Date(T0).toISOString(),
    ...over,
  };
}

function profileOf(...signals: TasteSignal[]): TasteProfile {
  return { version: TASTE_VERSION, signals };
}

/** In-memory IO with a hand-cranked clock — the only clock this module ever sees. */
function fakeIO(seed: Record<string, string> = {}, at = T0) {
  const files = new Map(Object.entries(seed));
  let clock = at;
  const io: TasteIO = {
    read: (file) => files.get(file) ?? null,
    write: (file, text) => void files.set(file, text),
    now: () => clock,
  };
  return {
    io,
    files,
    advanceWeeks: (weeks: number) => (clock += weeks * WEEK_MS),
  };
}

function weightOf(profile: TasteProfile, trait: string, now: number): number {
  return traitWeights(profile, now).find((t) => t.trait === trait)?.weight ?? 0;
}

describe("decay", () => {
  it("erodes a signal by 5% per week, compounding", () => {
    expect(decayFactor(0)).toBe(1);
    expect(decayFactor(WEEK_MS)).toBeCloseTo(0.95, 10);
    expect(decayFactor(2 * WEEK_MS)).toBeCloseTo(0.9025, 10);
    // A year of silence leaves a third of the original vote — enough to still be
    // read, not enough to still win an argument against anything recent.
    expect(decayFactor(52 * WEEK_MS)).toBeCloseTo(WEEKLY_RETENTION ** 52, 10);
    expect(decayFactor(52 * WEEK_MS)).toBeLessThan(0.1);
  });

  it("actually decays a recorded preference — the whole premise of the store", () => {
    const profile = profileOf(signal());

    const fresh = weightOf(profile, "dense-tables", T0);
    const aWeekOn = weightOf(profile, "dense-tables", T0 + WEEK_MS);
    const aQuarterOn = weightOf(profile, "dense-tables", T0 + 13 * WEEK_MS);

    expect(fresh).toBeCloseTo(1, 10);
    // The assertion that fails if decay is ever short-circuited to a constant.
    expect(aWeekOn).toBeLessThan(fresh);
    expect(aWeekOn).toBeCloseTo(0.95, 10);
    expect(aQuarterOn).toBeLessThan(aWeekOn);
    expect(aQuarterOn).toBeCloseTo(WEEKLY_RETENTION ** 13, 10);
  });

  it("lets a fresh signal outvote an older, otherwise-identical one", () => {
    // Same trait, same magnitude, opposite verdicts, ten weeks apart. If decay
    // did nothing these would cancel to exactly 0 and the trait would be a
    // coin-flip forever; because it does something, the recent rejection wins.
    const old = signal({ verdict: "approved", at: new Date(T0).toISOString() });
    const recent = signal({
      verdict: "rejected",
      at: new Date(T0 + 10 * WEEK_MS).toISOString(),
    });

    const now = T0 + 10 * WEEK_MS;
    expect(weightOf(profileOf(old, recent), "dense-tables", now)).toBeLessThan(
      0,
    );
  });

  it("refuses to reward a post-dated signal with a factor above 1", () => {
    // Clock skew, a hand-edited file, a laptop that travelled: none of them may
    // buy a preference more weight than it was worth on the day it was given.
    expect(decayFactor(-WEEK_MS)).toBe(1);

    const future = signal({ at: new Date(T0 + 52 * WEEK_MS).toISOString() });
    expect(weightOf(profileOf(future), "dense-tables", T0)).toBeCloseTo(1, 10);
  });

  it("gives a corrupt timestamp no vote at all", () => {
    const broken = { ...signal(), at: "last tuesday" };
    expect(weightOf(profileOf(broken), "dense-tables", T0)).toBe(0);
  });
});

describe("verdicts share one scale", () => {
  it("lowers a trait's weight when the user rejects it", () => {
    const approved = profileOf(signal());
    const thenRejected = profileOf(signal(), signal({ verdict: "rejected" }));

    const before = weightOf(approved, "dense-tables", T0);
    const after = weightOf(thenRejected, "dense-tables", T0);

    expect(before).toBeCloseTo(1, 10);
    expect(after).toBeLessThan(before);
    // Equal and opposite at the same instant: one pick and one rejection is a
    // trait we know nothing about, which is the honest answer.
    expect(after).toBeCloseTo(0, 10);
  });

  it("drives a repeatedly-rejected trait negative", () => {
    const profile = profileOf(
      signal({ verdict: "rejected" }),
      signal({ verdict: "rejected", note: "still too cramped" }),
    );
    expect(weightOf(profile, "dense-tables", T0)).toBeCloseTo(-2, 10);
    expect(preferences(profile, T0).avoid).toEqual(["dense-tables"]);
    expect(preferences(profile, T0).prefer).toEqual([]);
  });

  it("counts the evidence, not just the score", () => {
    const profile = profileOf(signal(), signal({ verdict: "rejected" }));
    // A 0 from two signals is a contested trait; a 0 from none is an absent one.
    // The consumer needs to be able to tell those apart.
    expect(traitWeights(profile, T0)[0]?.signals).toBe(2);
  });

  it("ranks by conviction in either direction, and breaks ties by name", () => {
    const profile = profileOf(
      signal({ trait: "zebra-striping" }),
      signal({ trait: "muted-accent", verdict: "rejected" }),
      signal({ trait: "muted-accent", verdict: "rejected" }),
      signal({ trait: "airy-spacing" }),
    );
    expect(traitWeights(profile, T0).map((t) => t.trait)).toEqual([
      // -2 beats +1 on conviction; the two +1s tie and sort alphabetically.
      "muted-accent",
      "airy-spacing",
      "zebra-striping",
    ]);
  });
});

describe("preferences", () => {
  it("withholds a trait that has not cleared the conviction floor", () => {
    // One weak pick is an opinion. Handing an opinion to the agent as if it were
    // a preference is how a single offhand click becomes the project's look.
    const profile = profileOf(signal({ weight: 0.3 }));
    expect(preferences(profile, T0)).toEqual({ prefer: [], avoid: [] });
    expect(preferences(profile, T0, 0.2).prefer).toEqual(["dense-tables"]);
  });

  it("stops recommending a preference that has decayed below the floor", () => {
    const profile = profileOf(signal());
    expect(preferences(profile, T0).prefer).toEqual(["dense-tables"]);
    // 0.95^n < 0.5 first at n = 14 weeks. Left un-reconfirmed for a quarter, the
    // trait stops governing new work on its own — nobody has to notice.
    expect(preferences(profile, T0 + 14 * WEEK_MS).prefer).toEqual([]);
  });
});

describe("stability", () => {
  it("is a pure function of (profile, now) — identical input, identical output", () => {
    const profile = profileOf(
      signal(),
      signal({ trait: "muted-accent", verdict: "rejected" }),
    );
    expect(traitWeights(profile, T0)).toEqual(traitWeights(profile, T0));
    expect(preferences(profile, T0)).toEqual(preferences(profile, T0));
  });

  it("does not depend on the order signals were written in", () => {
    const a = signal({ trait: "airy-spacing" });
    const b = signal({ trait: "muted-accent", verdict: "rejected" });
    expect(traitWeights(profileOf(a, b), T0)).toEqual(
      traitWeights(profileOf(b, a), T0),
    );
  });

  it("round-trips byte-identically, so a read never shows up as a diff", () => {
    const text = serialize(
      profileOf(signal(), signal({ trait: "airy-spacing" })),
    );
    expect(serialize(parse(text).profile)).toBe(text);
  });

  it("reinforces rather than deduplicates a repeated pick", () => {
    // Deliberate, and the opposite of idempotent: the user choosing the dense
    // variant on a third screen is new evidence, not a duplicate row. What must
    // stay stable is the *arithmetic*, not the count.
    const once = profileOf(signal());
    const thrice = profileOf(signal(), signal(), signal());
    expect(weightOf(thrice, "dense-tables", T0)).toBeCloseTo(
      3 * weightOf(once, "dense-tables", T0),
      10,
    );
  });
});

describe("compaction", () => {
  it("drops signals that have decayed into noise, and keeps the rest", () => {
    const ancient = signal({
      trait: "gradient-hero",
      at: new Date(T0).toISOString(),
    });
    const recent = signal({ at: new Date(T0 + 100 * WEEK_MS).toISOString() });
    const profile = profileOf(ancient, recent);

    // 0.95^n < 0.05 first at n = 59 weeks; at 100 weeks the old signal is worth
    // 0.6% of a vote and only costs bytes to keep.
    const now = T0 + 100 * WEEK_MS;
    expect(decayFactor(100 * WEEK_MS)).toBeLessThan(NEGLIGIBLE_WEIGHT);

    const compacted = compact(profile, now);
    expect(compacted.signals.map((s) => s.trait)).toEqual(["dense-tables"]);
  });

  it("keeps everything while it still carries a vote", () => {
    const profile = profileOf(signal(), signal({ trait: "airy-spacing" }));
    expect(compact(profile, T0).signals).toHaveLength(2);
  });
});

describe("parse", () => {
  it("treats a missing or empty file as an empty profile, not an error", () => {
    expect(parse(null)).toEqual({ profile: emptyProfile(), errors: [] });
    expect(parse("")).toEqual({ profile: emptyProfile(), errors: [] });
  });

  it("refuses a version it does not understand instead of guessing", () => {
    const { profile, errors } = parse(
      JSON.stringify({ version: 99, signals: [] }),
    );
    expect(profile.signals).toEqual([]);
    expect(errors.join("\n")).toContain("unknown taste-profile version 99");
  });

  it("reports a malformed signal by index and keeps the good ones", () => {
    const { profile, errors } = parse(
      JSON.stringify({
        version: TASTE_VERSION,
        signals: [
          signal(),
          { ...signal(), trait: "Dense Tables" },
          { ...signal(), verdict: "meh" },
          signal({ trait: "airy-spacing" }),
        ],
      }),
    );
    expect(profile.signals.map((s) => s.trait)).toEqual([
      "dense-tables",
      "airy-spacing",
    ]);
    expect(errors).toEqual([
      "signals[1]: 'trait' must be a kebab-case slug",
      "signals[2]: 'verdict' must be 'approved' or 'rejected'",
    ]);
  });

  it("does not throw on junk", () => {
    expect(parse("{not json").errors).toEqual(["not valid JSON"]);
    expect(parse("[]").errors).toEqual(["not a JSON object"]);
  });
});

describe("the IO boundary", () => {
  it("stamps `at` from the injected clock, never from the caller", () => {
    const { io, files, advanceWeeks } = fakeIO();

    record(io, {
      trait: "dense-tables",
      verdict: "approved",
      surface: "dashboard",
      note: "more rows, less scrolling",
    });
    advanceWeeks(4);
    const profile = record(io, {
      trait: "muted-accent",
      verdict: "rejected",
      surface: "pricing",
      note: "reads as disabled",
    });

    expect(profile.signals.map((s) => s.at)).toEqual([
      new Date(T0).toISOString(),
      new Date(T0 + 4 * WEEK_MS).toISOString(),
    ]);
    expect(files.get(TASTE_FILE)).toContain('"trait": "muted-accent"');
    expect(load(io).profile.signals).toHaveLength(2);
  });

  it("appends rather than rewriting history", () => {
    const { io } = fakeIO();
    const base = {
      trait: "dense-tables",
      verdict: "approved" as const,
      surface: "dashboard",
      note: "again",
    };
    record(io, base);
    const profile = record(io, base);
    // Two rows, not one row with weight 2: the file has to show that the user
    // said it twice, months apart, or the decay maths has nothing to work on.
    expect(profile.signals).toHaveLength(2);
    expect(profile.signals.every((s) => s.weight === 1)).toBe(true);
  });

  it("defaults weight to 1 and honours an explicit one", () => {
    const { io } = fakeIO();
    const profile = record(io, {
      trait: "gradient-hero",
      verdict: "rejected",
      weight: 3,
      surface: "landing",
      note: "never again",
    });
    expect(profile.signals[0]?.weight).toBe(3);
    expect(weightOf(profile, "gradient-hero", T0)).toBeCloseTo(-3, 10);
  });
});
