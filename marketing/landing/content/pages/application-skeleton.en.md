# What is an Application Skeleton in Gridfin

An Application Skeleton is a pre-assembled architectural foundation for building an application with Claude Code. It connects the stack, the project structure, engineering rules, tests, quality gates, skills and playbooks into one working process. Gridfin creates it within the first hour — and from then on the agent builds your product on that foundation.

## How an Application Skeleton differs from a boilerplate

- A boilerplate gives you finished code: a dashboard, billing, "50 features to customize" that you carve down.
- An Application Skeleton gives you a foundation and a process: a thin architectural base in which code grows toward your specific product — through specs, tests and review.

The difference shows on the twentieth feature: in a boilerplate you fight someone else's decisions, in a Skeleton you continue your own process.

## What's inside an Application Skeleton

- Next.js + TypeScript — the application foundation;
- Tailwind + shadcn/ui — the design system and components;
- engineering rules (`docs/rules`) — architecture, frontend, testing, security, git;
- tests — unit, component, integration and e2e, configured from day one;
- playbooks — step-by-step scenarios for deploys, analytics, pricing and other occasional tasks;
- skills — agent workflows: onboarding, features, design, review, verification, deploys;
- hooks — rules with teeth: a violation is stopped before the code is written;
- quality gates — lint, tests, e2e and the build in one run;
- an update mechanism — `/update` pulls new template releases without overwriting your code.

## How Claude Code works inside the Skeleton

- Specification first: the PRD and the feature spec are written before any code.
- `/feature` drives every feature through the spec → code → tests → review cycle.
- Tests must be able to fail: a feature without an honest test doesn't count as done.
- Review and gates: red status is visible before the merge, not after the release.

## Who it fits

- You have an idea and Claude Code, and you're ready to work with a terminal and git.
- You don't have years of full-stack experience — the architectural decisions are already made for you.
- You want your own real repository, not a no-code platform.

## Where the limits are

- The stack is fixed — Gridfin is deliberately not a pick-your-own-stack kit.
- It's not Lovable or Bolt: the work happens in a terminal, through Claude Code.
- It's not a ready-made dashboard with 50 features — the code grows toward your product, not the other way around.

Next: [why AI development needs engineering rules](https://ludvik4.dev/gridfin/en/guides/why-ai-needs-engineering-rules) · [Gridfin — home](https://ludvik4.dev/gridfin/en)
