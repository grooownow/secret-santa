# Spec: <feature name>

Copy this file to `docs/specs/<feature-slug>.md` and fill it in before
implementation starts (see `docs/rules/docs.md`, `feature` skill Step 1).

## Problem

What's broken or missing today, and for whom — one paragraph, no solutioning.

## Scope

What this feature covers and, explicitly, what it touches in the codebase
(routes, features, tables). Keep it to one shippable slice.

## UX flow

The user's path through this feature, step by step — screens/states, not
pixels. Note loading/empty/error states explicitly (see `docs/rules/frontend.md`).

## Data model

New/changed tables or fields (`src/db/schema.ts`), and who owns each row
(foreign key to `users`, per `docs/rules/architecture.md`'s data-access rule).

## Edge cases

The inputs/states that aren't the happy path — what should happen for each.

## Test scenarios

The scenarios that must have a test before this is done (see
`docs/rules/testing.md`'s decision table for which level each belongs at).

## Out-of-scope

What's deliberately deferred, so a later session doesn't assume this spec
covers it.

## Status

`draft` / `approved` / `in progress` / `shipped` — update as it moves.
