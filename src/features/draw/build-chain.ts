import { randomInt } from "node:crypto";

export type DrawEntry = { id: string; flat: string };
export type ChainLink = { giverId: string; receiverId: string };
export type ChainFailure = "too_few" | "household_too_large";
export type ChainResult =
  | { ok: true; links: ChainLink[] }
  | { ok: false; reason: ChainFailure; flat?: string };

export const MIN_PARTICIPANTS = 3;

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Most members of one flat that can still be placed into `slots` open seats
 * of a line whose two ends touch flats `a` (left) and `b` (right): members of
 * one flat may not sit next to each other nor next to the end that is theirs.
 */
function capacity(slots: number, flat: string, a: string, b: string): number {
  const blocked = Number(flat === a) + Number(flat === b);
  if (blocked === 0) return Math.ceil(slots / 2);
  if (blocked === 1) return Math.floor(slots / 2);
  return Math.max(0, Math.ceil(slots / 2) - 1);
}

/** Can the remaining people still fill the seats between `last` and `first`? */
function feasible(
  remaining: Map<string, number>,
  open: number,
  lastFlat: string,
  firstFlat: string,
): boolean {
  if (open === 0) return lastFlat !== firstFlat;
  for (const [flat, count] of remaining) {
    if (count > capacity(open, flat, lastFlat, firstFlat)) return false;
  }
  return true;
}

/**
 * Builds one cycle through everyone (each gives to one and receives from one)
 * where nobody gives to a person of their own flat. Needs at least 3 people
 * and no flat above half of all. Random depth-first search with pruning by
 * `feasible`; `crypto.randomInt` supplies the randomness.
 */
export function buildChain<E extends DrawEntry>(
  entries: readonly E[],
  /** Tried first as the next link after `last` (keeps alike people together). */
  prefer?: (last: E, candidate: E) => boolean,
): ChainResult {
  if (entries.length < MIN_PARTICIPANTS) {
    return { ok: false, reason: "too_few" };
  }

  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.flat, (counts.get(e.flat) ?? 0) + 1);
  const limit = Math.floor(entries.length / 2);
  for (const [flat, count] of counts) {
    if (count > limit) {
      return { ok: false, reason: "household_too_large", flat };
    }
  }

  const pool = shuffle(entries);
  const first = pool[0]!;
  const remaining = new Map(counts);
  remaining.set(first.flat, remaining.get(first.flat)! - 1);
  const path: E[] = [first];
  const used = new Set<string>([first.id]);

  function extend(): boolean {
    if (path.length === pool.length) return true;
    const last = path[path.length - 1]!;
    const open = pool.length - path.length - 1;
    const order = prefer
      ? [
          ...pool.filter((c) => prefer(last, c)),
          ...pool.filter((c) => !prefer(last, c)),
        ]
      : pool;
    for (const candidate of order) {
      if (used.has(candidate.id) || candidate.flat === last.flat) continue;
      remaining.set(candidate.flat, remaining.get(candidate.flat)! - 1);
      if (feasible(remaining, open, candidate.flat, first.flat)) {
        path.push(candidate);
        used.add(candidate.id);
        if (extend()) return true;
        path.pop();
        used.delete(candidate.id);
      }
      remaining.set(candidate.flat, remaining.get(candidate.flat)! + 1);
    }
    return false;
  }

  if (!extend()) {
    // The preconditions guarantee a chain; reaching this is a bug.
    throw new Error("could not build a chain for a valid neighbourhood");
  }

  return {
    ok: true,
    links: path.map((giver, i) => ({
      giverId: giver.id,
      receiverId: path[(i + 1) % path.length]!.id,
    })),
  };
}

export type KindedEntry = DrawEntry & { kind: "adult" | "child" };

/**
 * The draw with the «children give to children» rule (owner, 2 Nov). With at
 * least three children and three adults that can each form a chain, children
 * and adults get two separate cycles. Otherwise (one or two children, or the
 * children of mostly one flat) everyone is in one cycle where children are
 * kept next to each other, so a child gives to an adult as rarely as the
 * flats allow. The flat rule always holds.
 */
export function buildDraw(entries: readonly KindedEntry[]): ChainResult {
  const children = entries.filter((e) => e.kind === "child");
  const adults = entries.filter((e) => e.kind === "adult");
  if (
    children.length >= MIN_PARTICIPANTS &&
    adults.length >= MIN_PARTICIPANTS
  ) {
    const kids = buildChain(children);
    const grown = buildChain(adults);
    if (kids.ok && grown.ok) {
      return { ok: true, links: [...grown.links, ...kids.links] };
    }
  }
  return buildChain(entries, (last, candidate) => candidate.kind === last.kind);
}
