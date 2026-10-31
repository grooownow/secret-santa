export const BUILDINGS = ["K", "B", "D"] as const;
export type Building = (typeof BUILDINGS)[number];

/**
 * Key that identifies a flat for the draw: upper case, no spaces or hyphens,
 * so `2b`, `2 B` and `2-B` of one building are the same flat.
 */
export function flatKey(building: string, apartment: string): string {
  const flat = apartment.toUpperCase().replace(/[\s -]+/g, "");
  return `${building.trim().toUpperCase()}:${flat}`;
}
