// Stub for the `server-only` package, used exclusively by the vitest alias in
// vitest.config.ts. The real package throws when imported outside a React
// Server Component context, which includes vitest's plain node environment.
// Aliasing it to this no-op keeps modules that import "server-only" (e.g.
// src/lib/logger.ts) testable without weakening the guard in app/browser code.
export {};
