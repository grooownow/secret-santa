# Project Manifest

The identity card of this project, read by every agent session (see
`CLAUDE.md`). The skills read the chat language from here.

## Product

Secret Santa for the Bialto neighbours: a one-off free New Year game. People
register, the organiser runs the draw, each Santa leaves a gift for their
recipient in a locker or mailbox, and on 1 January the Santas are revealed. The
business logic lives in `docs/superpowers/specs/2026-10-31-secret-santa-design.md`.

## Chat language

The language the agent speaks with you in chat (artifacts stay English).
To change it later, edit the value below (or just ask the agent to switch).

Russian

## Deploy

Deploy gate: accepted risk (owner, 2026-11-02). Vercel deploys every push to
`main`; run `pnpm gates` before pushing.
