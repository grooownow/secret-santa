/**
 * The taste profile: what this user actually picks, and how fast that stops
 * being true.
 *
 * The `design` skill shows the user several variants of a surface and the user
 * picks one. That pick is the only honest signal we will ever get about taste —
 * it is a revealed preference, not a stated one, and stated preferences about
 * design are notoriously unreliable ("I like minimal" from someone who picks the
 * dense variant every time). So the store records picks and rejections, not
 * adjectives, and the adjectives it does keep (`note`) are the user's own words,
 * quoted back at them later rather than paraphrased into a rule.
 *
 * The load-bearing idea is DECAY. A preferences file that only accumulates turns
 * into a fossil: the first three sessions of a project decide its look forever,
 * because nothing that arrives later can outvote a claim that never gets
 * quieter. Every signal here is worth 5% less per week (see WEEKLY_RETENTION), so
 * a preference has to keep being re-confirmed to keep governing. A taste the user
 * has moved on from fades on its own, without anyone having to notice that it
 * should. That is a different object from a rules file, and it is why this is not
 * one: rules are enforced, tastes are merely weighted.
 *
 * Two structural rules follow from wanting this to be testable at all:
 *
 *   1. **No `Date.now()` below the IO boundary.** Every function that computes a
 *      weight takes `now` as an argument. A decay function that reads the wall
 *      clock cannot be proven to decay — the test would have to sleep a week.
 *   2. **No `node:fs`.** The store is text in, text out; `read`/`write`/`now` are
 *      injected as `TasteIO`. The tests exercise the real arithmetic against an
 *      in-memory profile, which is the only way the decay proof is a proof.
 */

/** Repo-relative, so the skill and the tests name the same file. */
export const TASTE_FILE = "docs/design-taste.json";

/** Bumped only on a breaking shape change; an unknown version is not silently read. */
export const TASTE_VERSION = 1;

/**
 * 5% of a signal's weight is gone after a week — a half-life of about 13.5
 * weeks. Chosen so that a preference confirmed once a month keeps roughly its
 * strength while one confirmed once and never again is worth a third of its
 * original vote by the end of a quarter. Fast enough to track taste, slow enough
 * that a single session cannot rewrite the project's look.
 */
export const WEEKLY_RETENTION = 0.95;

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Below this decayed absolute weight a signal no longer changes any decision it
 * takes part in, so `compact` may drop it. It is a file-size bound, not a
 * semantic one — anything above it is kept whether or not it is currently
 * winning.
 */
export const NEGLIGIBLE_WEIGHT = 0.05;

export type Verdict = "approved" | "rejected";

/**
 * One design decision, as observed rather than as declared.
 *
 * A `trait` is the unit of taste we can actually carry from one surface to the
 * next: `dense-tables`, `generous-whitespace`, `muted-accent`. It is deliberately
 * coarser than a token and coarser than a component — "the user picked variant B"
 * is not transferable, "the user picked the dense one, again" is.
 */
export interface TasteSignal {
  /** kebab-case trait slug. The join key: two signals only reinforce if they agree on the name. */
  trait: string;
  verdict: Verdict;
  /**
   * Base magnitude before decay. Default 1. Reserve >1 for a signal the user
   * went out of their way to give (an explicit "never do this again"), never for
   * the agent's own enthusiasm about its favourite variant.
   */
  weight: number;
  /** The surface it was observed on, so a stale trait can be traced to the screen that produced it. */
  surface: string;
  /** The user's own words. Quoted, never paraphrased — the paraphrase is where taste gets lost. */
  note: string;
  /** ISO timestamp, stamped from the injected clock at the IO boundary. Never typed from memory. */
  at: string;
}

export interface TasteProfile {
  version: number;
  signals: TasteSignal[];
}

/** A trait's current standing: signed, decayed, and traceable back to its evidence. */
export interface TraitWeight {
  trait: string;
  /** Positive = the user keeps picking it. Negative = they keep rejecting it. */
  weight: number;
  /** How many signals (of any verdict) fed this number — a 0.9 from six signals is not a 0.9 from one. */
  signals: number;
}

export function emptyProfile(): TasteProfile {
  return { version: TASTE_VERSION, signals: [] };
}

/**
 * The decay multiplier for a signal of a given age.
 *
 * A signal from the future (clock skew, a hand-edited file, a machine whose
 * timezone changed) is clamped to age 0 rather than allowed a factor above 1.
 * Otherwise the cheapest way to make a preference permanent would be to
 * post-date it, and a store that rewards that is a store that gets gamed by
 * accident.
 */
export function decayFactor(ageMs: number): number {
  if (ageMs <= 0) return 1;
  return WEEKLY_RETENTION ** (ageMs / WEEK_MS);
}

function signalWeight(signal: TasteSignal, now: number): number {
  const at = Date.parse(signal.at);
  // An unparseable timestamp is treated as maximally old rather than as fresh:
  // a corrupt record should lose its vote, not keep it forever.
  if (Number.isNaN(at)) return 0;
  const magnitude = signal.weight * decayFactor(now - at);
  return signal.verdict === "approved" ? magnitude : -magnitude;
}

/**
 * Current standing of every trait, newest evidence dominating.
 *
 * Rejections subtract from the same number approvals add to, which is the whole
 * reason verdicts share a scale: "they liked it twice in March and hated it in
 * July" must be able to come out negative, and it does, because July's signal has
 * barely decayed while March's has.
 *
 * Pure in `now`: same profile + same `now` = same numbers, forever.
 */
export function traitWeights(
  profile: TasteProfile,
  now: number,
): TraitWeight[] {
  const totals = new Map<string, TraitWeight>();

  for (const signal of profile.signals) {
    const entry = totals.get(signal.trait) ?? {
      trait: signal.trait,
      weight: 0,
      signals: 0,
    };
    entry.weight += signalWeight(signal, now);
    entry.signals += 1;
    totals.set(signal.trait, entry);
  }

  // Strongest conviction first, in either direction — a trait the user hates is
  // as actionable as one they love. Ties break on the trait name so the output
  // is a function of the input and not of Map insertion order; a ranking that
  // shuffles between runs cannot be diffed, and an undiffable profile is one
  // nobody will notice going wrong.
  return [...totals.values()].sort(
    (a, b) =>
      Math.abs(b.weight) - Math.abs(a.weight) || a.trait.localeCompare(b.trait),
  );
}

/**
 * The two lists the skill actually injects into a prompt. `minWeight` is the
 * conviction floor: below it we have an opinion, not a preference, and feeding
 * the agent a weak opinion as if it were a rule is how one offhand pick becomes
 * the project's design language.
 */
export function preferences(
  profile: TasteProfile,
  now: number,
  minWeight = 0.5,
): { prefer: string[]; avoid: string[] } {
  const ranked = traitWeights(profile, now);
  return {
    prefer: ranked.filter((t) => t.weight >= minWeight).map((t) => t.trait),
    avoid: ranked.filter((t) => t.weight <= -minWeight).map((t) => t.trait),
  };
}

/**
 * Drops signals that have decayed into noise. Append-only would eventually make
 * every read parse a year of dead votes for a number that rounds to zero.
 *
 * It takes `now` rather than reading the clock so that "what would a compaction
 * delete?" is a question a caller (or a test) can ask about any point in time.
 */
export function compact(
  profile: TasteProfile,
  now: number,
  threshold = NEGLIGIBLE_WEIGHT,
): TasteProfile {
  return {
    version: profile.version,
    signals: profile.signals.filter(
      (signal) => Math.abs(signalWeight(signal, now)) >= threshold,
    ),
  };
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function toSignal(value: unknown): TasteSignal | string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "not a JSON object";
  }
  const raw = value as Record<string, unknown>;

  if (typeof raw.trait !== "string" || !SLUG.test(raw.trait)) {
    return "'trait' must be a kebab-case slug";
  }
  if (raw.verdict !== "approved" && raw.verdict !== "rejected") {
    return "'verdict' must be 'approved' or 'rejected'";
  }
  if (typeof raw.weight !== "number" || !Number.isFinite(raw.weight)) {
    return "'weight' must be a finite number";
  }
  if (typeof raw.surface !== "string" || raw.surface.trim() === "") {
    return "'surface' must name the screen the signal came from";
  }
  if (typeof raw.note !== "string") {
    return "'note' must be a string (the user's own words, possibly empty)";
  }
  if (typeof raw.at !== "string" || Number.isNaN(Date.parse(raw.at))) {
    return "'at' must be an ISO timestamp";
  }

  return {
    trait: raw.trait,
    verdict: raw.verdict,
    weight: raw.weight,
    surface: raw.surface,
    note: raw.note,
    at: raw.at,
  };
}

export interface ParseResult {
  profile: TasteProfile;
  /** Malformed signals, reported rather than thrown: one bad record must not hide the rest. */
  errors: string[];
}

/**
 * Text → profile. A missing file is an empty profile (the first session has no
 * taste yet, and that is not an error); a file we cannot read at all is an empty
 * profile plus a loud error, never a silent reset of the user's history.
 */
export function parse(text: string | null): ParseResult {
  if (text === null || text.trim() === "") {
    return { profile: emptyProfile(), errors: [] };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { profile: emptyProfile(), errors: ["not valid JSON"] };
  }

  const raw = value as Record<string, unknown> | null;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { profile: emptyProfile(), errors: ["not a JSON object"] };
  }
  if (raw.version !== TASTE_VERSION) {
    return {
      profile: emptyProfile(),
      errors: [
        `unknown taste-profile version ${String(raw.version)} (this build reads ${TASTE_VERSION}) — refusing to guess at its shape`,
      ],
    };
  }

  const errors: string[] = [];
  const signals: TasteSignal[] = [];
  const list = Array.isArray(raw.signals) ? raw.signals : [];

  list.forEach((entry, index) => {
    const result = toSignal(entry);
    if (typeof result === "string") {
      errors.push(`signals[${index}]: ${result}`);
      return;
    }
    signals.push(result);
  });

  return { profile: { version: TASTE_VERSION, signals }, errors };
}

/**
 * Profile → text. Keys are written in a fixed order and the field set is
 * explicit, so re-serializing an unchanged profile is byte-identical: a session
 * that merely *reads* the taste file must never show up in `git diff`, or nobody
 * will read the diffs that matter.
 */
export function serialize(profile: TasteProfile): string {
  const body = {
    version: profile.version,
    signals: profile.signals.map((signal) => ({
      trait: signal.trait,
      verdict: signal.verdict,
      weight: signal.weight,
      surface: signal.surface,
      note: signal.note,
      at: signal.at,
    })),
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

/** What the pure core needs from the outside world, and nothing more. */
export interface TasteIO {
  /** `null` when the file does not exist — distinct from an empty file. */
  read: (file: string) => string | null;
  write: (file: string, text: string) => void;
  /** Epoch milliseconds. The single place the wall clock enters this module. */
  now: () => number;
}

/** What a caller supplies; `at` is stamped from the clock, never passed in. */
export type SignalInput = Omit<TasteSignal, "at" | "weight"> &
  Partial<Pick<TasteSignal, "weight">>;

export function load(io: TasteIO, file: string = TASTE_FILE): ParseResult {
  return parse(io.read(file));
}

/**
 * Append one signal and persist. Appending — never editing an earlier signal in
 * place — is what makes the history readable: the file shows that the user liked
 * dense tables in May and said so again in July, and the decay maths is what
 * turns that history into a current opinion. Rewriting the May record to "1.7"
 * would produce the same number and destroy the evidence.
 */
export function record(
  io: TasteIO,
  input: SignalInput,
  file: string = TASTE_FILE,
): TasteProfile {
  const { profile } = load(io, file);
  const next: TasteProfile = {
    version: TASTE_VERSION,
    signals: [
      ...profile.signals,
      {
        trait: input.trait,
        verdict: input.verdict,
        weight: input.weight ?? 1,
        surface: input.surface,
        note: input.note,
        at: new Date(io.now()).toISOString(),
      },
    ],
  };
  io.write(file, serialize(next));
  return next;
}
