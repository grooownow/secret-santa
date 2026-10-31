/**
 * The single source of truth for the local app port. Rare on purpose
 * (3210 = "3-2-1-0" launch countdown) so it does not collide with the
 * defaults of Next (3000), Angular (4200), or Vite (5173).
 *
 * TypeScript consumers (scripts/dev.ts, playwright.config.ts) import this.
 * Consumers that cannot import it at runtime — lighthouserc.js (CJS
 * require) and src/lib/env.ts (kept literal to avoid a config/ -> src/
 * import) — hold a literal that src/lib/ports.test.ts asserts against.
 */
export const APP_PORT = 3210;
