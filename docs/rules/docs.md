# Rule: Documentation

**Applies to:** any change to `docs/`, `CLAUDE.md`/`AGENTS.md`, or a decision
worth remembering across sessions (spec §5.9). Docs are the interface between
agent sessions — stale docs are worse than missing ones.

## The docs map

| Lives in                              | Holds                                                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/rules/*.md`                     | This file's siblings — one topic each, read the one matching your task                                                                                                                                   |
| `docs/prd.md`                         | Product requirements, written by `/gridfin`                                                                                                                                                              |
| `docs/idea.md`                        | Product idea + fit check, written by `/gridfin`                                                                                                                                                          |
| `docs/specs/`                         | Feature specs (what/why for a change), written by `/gridfin` + `/feature`                                                                                                                                |
| `docs/specs/<slug>.plan.md`           | The slice's touch-point map + open decisions, written by `/feature` Step 2. Its last line is the `NO UNRESOLVED DECISIONS` sentinel, and it is the resume point when a session drops mid-feature         |
| `docs/decisions/`                     | ADR-lite records, one file per decision (see below)                                                                                                                                                      |
| `docs/templates/`                     | Authoring skeletons (`spec.md`, `prd.md`, `idea.md`, `decision.md`)                                                                                                                                      |
| `docs/manifest.md`, `docs/roadmap.md` | Product identity + Now/Next/Later, filled by `/gridfin`                                                                                                                                                  |
| `docs/playbooks/`                     | Step-by-step prompt-plans for occasional flows (deploy, billing, pricing, …)                                                                                                                             |
| `docs/qa/project-profile.md`          | qa-pilot companion's pre-filled project profile                                                                                                                                                          |
| `docs/design.md`                      | The visual contract — tokens, scales, installed primitives — derived from `src/app/globals.css` by `/design`, never invented. Its companion `docs/design-taste.json` is written by the tool, not by hand |
| `CLAUDE.md` / `AGENTS.md`             | Thin entry maps — links only, no duplicated detail                                                                                                                                                       |

See `docs/decisions/0001-gridfin-baseline.md` for the ADR format by example,
and `docs/templates/` for the authoring skeletons this map refers to.

## Short files, not a monolith

Each `docs/rules/*.md` covers one topic and stays short on purpose (≤ 120
lines) — an agent reads only the rule file relevant to its current task, not
the whole set. `CLAUDE.md`/`AGENTS.md` follow the same principle at the entry
level: they map to `docs/rules/`, they never grow into a duplicate copy of it.

## ADR-lite: when a decision earns a file

Write a `docs/decisions/<NNNN>-<slug>.md` entry (context → decision →
consequences, per `docs/templates/decision.md`) when a change:

- picks a library/pattern where a reasonable alternative existed, or
- deliberately deviates from a rule in `docs/rules/` (e.g. the `tmp` audit
  override in security.md), or
- would otherwise make the next session re-litigate something already
  decided.

The agent drafts it; the user approves. A future session reads the decision
instead of re-arguing it.

## Actualization rule

The `feature` skill's final step checks: did this change alter behavior or
structure? If yes, update the relevant `docs/manifest.md` section,
`docs/rules/*` (if a convention changed), or the originating spec's status —
before calling the feature done. Docs that don't track reality are actively
misleading, not neutral.

## Language

Everything checked into this repo — code, comments, commits, docs — is
English. Chat with the user in the project's chat language (`docs/manifest.md`
→ _Chat language_; falls back to the language of the user's messages while
unset); only the artifacts that live in the repo are English-only.

## Gates (self-check before done)

- [ ] New/changed behavior has its doc trail updated (manifest/rules/spec)
- [ ] A real decision got a `docs/decisions/` entry, not just a commit message
- [ ] Rule file you touched is still ≤ 120 lines and stays on one topic
- [ ] No non-English content added to a shipped doc
