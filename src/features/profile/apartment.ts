export const BUILDINGS = ["K", "B", "D"] as const;
export type Building = (typeof BUILDINGS)[number];

/**
 * Key that identifies a flat for the draw, so neighbours who type their flat
 * differently still count as one flat: case, spaces, punctuation (`-` `.` `/`),
 * the ordinal signs `º` `ª` `°` and leading zeros of a number are ignored.
 * `2b`, `2 B`, `2-B`, `2ºB`, `2.B`, `2/B` and `02B` are all `2B`.
 */
export function flatKey(building: string, apartment: string): string {
  const flat = apartment
    // Before NFKC, which would turn º and ª into the letters o and a.
    .replace(/[ºª°]/g, "")
    .normalize("NFKC")
    .toUpperCase()
    // Leading zeros of each number, while separators still mark where a
    // number starts (`1-03` is `1-3`, not `103`).
    .replace(/(^|\D)0+(?=\d)/g, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return `${building.trim().toUpperCase()}:${flat}`;
}
