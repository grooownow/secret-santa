import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildChain, type DrawEntry } from "./build-chain";

/** Random neighbourhood that satisfies the "no flat above half" rule. */
function randomNeighbourhood(): DrawEntry[] {
  for (;;) {
    const size = randomInt(3, 41);
    const flats = randomInt(2, Math.min(size, 14) + 1);
    const entries: DrawEntry[] = [];
    for (let i = 0; i < size; i += 1) {
      // Skewed on purpose: low flat numbers get many members.
      const flat = Math.min(randomInt(0, flats), randomInt(0, flats));
      entries.push({ id: `p${i}`, flat: `K:${flat}` });
    }
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.flat, (counts.get(e.flat) ?? 0) + 1);
    if (Math.max(...counts.values()) <= Math.floor(size / 2)) return entries;
  }
}

function expectSingleCycle(
  links: { giverId: string; receiverId: string }[],
  entries: DrawEntry[],
) {
  expect(links).toHaveLength(entries.length);
  const next = new Map(links.map((l) => [l.giverId, l.receiverId]));
  expect(next.size).toBe(entries.length);
  expect(new Set(links.map((l) => l.receiverId)).size).toBe(entries.length);
  const start = entries[0]!.id;
  let cur = start;
  const seen = new Set<string>();
  do {
    seen.add(cur);
    cur = next.get(cur)!;
  } while (cur !== start && !seen.has(cur));
  expect(cur).toBe(start);
  expect(seen.size).toBe(entries.length);
}

function expectNoSameFlat(
  links: { giverId: string; receiverId: string }[],
  entries: DrawEntry[],
) {
  const flat = new Map(entries.map((e) => [e.id, e.flat]));
  for (const l of links) {
    expect(flat.get(l.giverId)).not.toBe(flat.get(l.receiverId));
  }
}

function make(...sizes: number[]): DrawEntry[] {
  return sizes.flatMap((size, flat) =>
    Array.from({ length: size }, (_, i) => ({
      id: `f${flat}-${i}`,
      flat: `K:${flat}`,
    })),
  );
}

describe("buildChain", () => {
  it("500 random neighbourhoods form one cycle with no same-flat link", () => {
    for (let i = 0; i < 500; i += 1) {
      const entries = randomNeighbourhood();
      const r = buildChain(entries);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expectSingleCycle(r.links, entries);
      expectNoSameFlat(r.links, entries);
    }
  });

  it("fewer than 3 participants fails with too_few", () => {
    expect(buildChain([])).toEqual({ ok: false, reason: "too_few" });
    expect(buildChain(make(1, 1))).toEqual({ ok: false, reason: "too_few" });
  });

  it("a flat with more than half of everyone fails and names the flat", () => {
    expect(buildChain(make(3, 1, 1))).toEqual({
      ok: false,
      reason: "household_too_large",
      flat: "K:0",
    });
    expect(buildChain(make(1, 4, 2))).toMatchObject({
      ok: false,
      reason: "household_too_large",
      flat: "K:1",
    });
  });

  it("exactly half from one flat still works", () => {
    for (const entries of [make(2, 1, 1), make(3, 1, 1, 1), make(5, 5)]) {
      const r = buildChain(entries);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expectSingleCycle(r.links, entries);
      expectNoSameFlat(r.links, entries);
    }
  });

  it("three people from three flats form a cycle", () => {
    const entries = make(1, 1, 1);
    const r = buildChain(entries);
    expect(r.ok).toBe(true);
    if (r.ok) expectSingleCycle(r.links, entries);
  });

  it("does not depend on the input order", () => {
    const entries = make(4, 1, 1, 1, 1);
    for (let i = 0; i < 50; i += 1) {
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      const r = buildChain(shuffled);
      expect(r.ok).toBe(true);
      if (r.ok) expectNoSameFlat(r.links, entries);
    }
  });

  it("handles a 70-person worst case quickly", () => {
    const entries = make(35, 5, 5, 5, 5, 5, 5, 5);
    const started = Date.now();
    const r = buildChain(entries);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expectSingleCycle(r.links, entries);
      expectNoSameFlat(r.links, entries);
    }
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
