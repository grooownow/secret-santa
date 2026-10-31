# Sources

**Applies to:** any line of code or prose that asserts how a third-party
framework, library, or API behaves.

A claim about a framework's API is a fact about a specific version, and the
model's memory of it is a snapshot of an older one. This rule says: look it
up, at the moment you write the line that depends on it.

## The rule

Any claim about a **third-party** API surface that the code depends on —
that a function exists, what it returns, what a config key is called, what
the default is, whether it is deprecated — is verified against the docs for
the version in `package.json` **before** the code that relies on it is
written. Not after it fails. Not from memory.

This does not apply to our own code: read `src/`.

## Where to look, in order

1. **context7 MCP** — `resolve-library-id` then `query-docs`. Fastest, and
   version-aware.
2. **Official docs**, fetched. The framework's own site, not a blog post and
   not a StackOverflow answer.
3. **The installed types** in `node_modules`. Authoritative for shape, silent
   about semantics and about what is deprecated.

Memory is not on this list.

## Where it bites in this stack

| Dependency                | The trap                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Next.js                   | App Router semantics move between majors: caching defaults, the `middleware` runtime, `use cache`.                           |
| drizzle-orm / drizzle-kit | Migration commands and config keys have been renamed across minors.                                                          |
| Vitest 4                  | `poolOptions.threads.singleThread` was removed; `fileParallelism` replaced it. `vitest.config.ts` already carries that scar. |
| Playwright                | Config surface and `webServer` semantics shift; `reuseExistingServer` behavior is version-specific.                          |
| next-auth                 | Major-version rewrites change the entire callback surface.                                                                   |

## Recording what you found

When a version-specific behavior **drives a design choice**, record it where
the next reader will look:

- A real decision → an ADR in `docs/decisions/`, citing the doc URL and the
  version it describes.
- A single surprising line of code → a comment naming the _constraint_, per
  `CLAUDE.md`'s comment policy. `vitest.config.ts`'s note about Vitest 4's
  pool rework is the exemplar.

Do **not** cache doc citations across sessions in the repo. A stale citation
is worse than no citation: it looks like verification and is not.

## Gates (self-check before done)

- [ ] Every third-party API this diff newly depends on was looked up this
      session, or is cited in an ADR
- [ ] No API used that is absent from the installed version's types
- [ ] Version-driven design choices are recorded (ADR or constraint comment)

## Common rationalizations

| Rationalization                                        | Reality                                                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| "I know this API, I've used it a hundred times"        | In which version? The hundred times are the problem: they are why the old shape feels right.                               |
| "It typechecks, so the API exists"                     | Types prove shape, not semantics, and say nothing about deprecation or about the default you assumed.                      |
| "The docs are slow to fetch, I'll verify if it breaks" | Then you verify during debugging, with a broken build and less context. The lookup is cheapest before the line is written. |
| "A blog post from last year explains it well"          | Last year is a major version. Official docs for the pinned version, or nothing.                                            |

## Red flags

- A framework API introduced in a diff with no doc lookup anywhere in the
  session transcript
- A config key copied from another project without checking it still exists
- An ADR that cites a doc without naming the version it describes
