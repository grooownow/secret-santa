# Why AI development needs engineering rules

Claude Code can write code fast, but without engineering rules it doesn't know which decisions must stay stable between sessions. Every new session starts from a clean context — and re-decides how to build the project.

## AI speeds up writing code, but doesn't replace the process

The speed of generating code is not the same as the speed of building a product. A product is driven by decisions: which stack, where the module boundaries are, what counts as "done". Engineering teams accumulate those decisions over years; an agent without a process makes them anew every day — and differently every time.

## What breaks without rules, specs and tests

- The architecture drifts: every session builds its own way, and the code stops adding up to one system.
- Features break each other: without tests a regression is invisible until a user runs into it.
- Review doesn't happen: the agent writes code faster than you can read it.
- A small change turns into rewriting half the project.

## Why a rules file is not enough

A file with rules is a wish: the agent can read it and still do things its own way, and nobody is there to check. A rule only works when violating it stops something.

## How hooks and quality gates turn rules into a mechanism

- Hooks inspect every proposed change and stop a violation before the code is written.
- Quality gates — lint, tests, e2e and the build in one run — show red status before the merge.
- Tests must be able to fail: a "green" test that can't break verifies nothing.

## How Gridfin applies this in the Application Skeleton

Gridfin ships all of this pre-assembled: an [Application Skeleton](https://ludvik4.dev/gridfin/en/docs/application-skeleton) with rules, hooks, tests and gates — and a process where the spec precedes the code and verification is built into every step. More on the [Gridfin home page](https://ludvik4.dev/gridfin/en).
