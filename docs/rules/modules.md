# Modules

**Applies to:** any `modules/<name>/` directory and any skill that installs one.

A **module** is an optional capability a project adds on top of the Landing
core (db, auth, billing …). The Landing core is the canonical `src/`; modules
are not compiled, linted, or tested as part of the core (they live outside the
`tsconfig`/eslint/vitest surface) — they are materialized into a project only
when installed.

## Layout

    modules/<name>/
      module.md     # frontmatter + "## Apply plan" (required)
      files/         # verbatim files copied into the project on install
      fragments/     # snippets spliced into shared core files at markers

## `module.md` frontmatter (all required)

- `name` — kebab-case, matches the directory.
- `description` — one line.
- `depends-on` — YAML array of other module names (may be `[]`).
- `presets` — YAML array of presets that include this module (non-empty).

## `## Apply plan`

A numbered, blockquoted prompt-plan an agent follows to install the module —
same idiom as a `CHANGELOG.md` release apply plan. It MUST start by running the
deterministic applier (`pnpm module:apply <name>`, which does the mechanical
copy/patch/splice) and then list the judgment "wiring" steps a real project
needs, ending in a Conventional-Commit commit. `pnpm modules:validate` (CI)
checks this structure.
