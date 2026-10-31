import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import path from "node:path";

// Modules live outside the core compile/lint/test surface (docs/rules/modules.md):
// files under modules/<name>/files/ are verbatim copies destined for a target
// project, not this repo's own test surface. Every project below opts out of
// modules/** on top of vitest's own defaults.
const exclude = [...configDefaults.exclude, "modules/**"];

// `server-only` throws when imported outside a React Server Component
// context, which includes both vitest projects below. Alias it to a no-op
// stub so modules guarded by `import "server-only"` (e.g. src/lib/logger.ts)
// stay testable. See test/server-only-mock.ts.
const alias = {
  "@": path.resolve(__dirname, "src"),
  "server-only": path.resolve(__dirname, "test/server-only-mock.ts"),
};

export default defineConfig({
  test: {
    // Landing ships no client-component or integration tests; those live in
    // the persistence module and re-appear when it is applied. Keep the
    // "component" and "integration" projects defined (so an applied module has
    // a home for them) but don't fail the run while they match no files.
    passWithNoTests: true,
    projects: [
      {
        // Plain node tests: server actions, db helpers, config, etc.
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude,
          // src/lib/auth.ts pulls in `next-auth`, which imports
          // `next/server` without a file extension. `next`'s package.json
          // has no `exports` map, so Node's strict ESM resolution (used by
          // Vitest's node environment) can't resolve the bare specifier
          // unless the module is routed through Vite's transform (inlined)
          // so the alias below applies — same workaround the "integration"
          // project below already uses; mirrored here for unit tests that
          // import auth.ts.
          server: { deps: { inline: [/next-auth/, /^next\//] } },
        },
        resolve: {
          alias: {
            ...alias,
            "next/server": path.resolve(
              __dirname,
              "node_modules/next/server.js",
            ),
          },
        },
      },
      {
        // Client-component tests via Testing Library, need a DOM.
        plugins: [react()],
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          exclude,
          setupFiles: ["./vitest.setup.ts"],
        },
        resolve: { alias },
      },
      {
        // Integration tests: real (in-memory PGlite) db + direct route/action
        // calls, as opposed to the mocked-db unit tests above. Each test file
        // spins up its own PGlite instance (see tests/integration/helpers/test-db.ts),
        // so keep this project single-threaded — PGlite instances don't love
        // concurrency, and there's no cross-file shared state to parallelize.
        // Vitest 4 removed `poolOptions.threads.singleThread` (see the "pool
        // rework" migration guide); `fileParallelism: false` is the
        // replacement — it pins the project to a single worker.
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          exclude,
          pool: "threads",
          fileParallelism: false,
          server: { deps: { inline: [/next-auth/, /^next\//] } },
        },
        resolve: {
          alias: {
            ...alias,
            "next/server": path.resolve(
              __dirname,
              "node_modules/next/server.js",
            ),
          },
        },
      },
      {
        // Repo tooling that isn't application code: the skill validator and
        // the skill eval harness under scripts/. Plain node, no aliases —
        // these modules import nothing from src/.
        test: {
          name: "tooling",
          environment: "node",
          include: ["scripts/**/*.test.ts"],
          exclude,
        },
      },
      // The marketing landing lives in marketing/landing/ as a self-contained
      // folder: content JSON per locale, the i18n:check gate, and the
      // static-site generator. Plain node, no aliases — imports nothing from
      // src/. Conditional on the directory existing because marketing/ is
      // excluded from the template export (scripts/export-template.sh): in a
      // buyer's tree this project must vanish rather than fail with an empty
      // include glob.
      ...(existsSync(path.resolve(__dirname, "marketing/landing"))
        ? [
            {
              test: {
                name: "landing",
                environment: "node",
                include: ["marketing/landing/**/*.test.ts"],
                exclude,
              },
            },
          ]
        : []),
    ],
  },
});
