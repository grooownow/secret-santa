# Product Manifest

This file is your project's identity card — the one doc every agent session
reads first (see `CLAUDE.md`/`AGENTS.md`). It starts empty on purpose: the
`/gridfin` skill fills it in during onboarding. Every unfilled field is marked
`<!-- gridfin:fill -->` right after it, so a skill can find what's left
programmatically (`grep gridfin:fill docs/manifest.md`) — remove the marker
on the same line once you fill the field, don't delete the heading.

## Product name

<!-- gridfin:fill -->

## One-liner

What this product does, in one sentence a stranger would understand.

<!-- gridfin:fill -->

## Target user

Who this is for — one concrete persona, not "everyone."

<!-- gridfin:fill -->

## Domain entities

The core nouns of the product (e.g. "trips, days, waypoints, gear lists").
These map to `src/db/schema.ts` tables once Step 4 of `/gridfin` runs.

<!-- gridfin:fill -->

## Preset

One of: `Landing` / `App` / `App+Billing`. Chosen in Step 1 of `/gridfin`,
right after the fit check. Determines which modules Step 4 installs.

<!-- gridfin:fill -->

## Installed modules

The `modules/<name>/` directories applied to this project (via
`pnpm module:apply <name>`), in install order. Empty for `Landing`.

<!-- gridfin:fill -->

## Current phase

One of: `idea` / `building v1` / `live` / `paused`.

<!-- gridfin:fill -->

## Chat language

The language the agent speaks with you in chat (artifacts stay English).
To change it later, edit the value below (or just ask the agent to switch).

<!-- gridfin:fill -->

## Key URLs

| What       | URL                   |
| ---------- | --------------------- |
| Production | <!-- gridfin:fill --> |
| Staging    | <!-- gridfin:fill --> |
| Repo       | <!-- gridfin:fill --> |

## Status

This manifest still has unfilled fields — run `/gridfin` to complete
onboarding. Once every field above is filled, this line should read: "Manifest
complete — see `docs/roadmap.md` for what's next."
