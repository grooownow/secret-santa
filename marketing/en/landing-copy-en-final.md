---
title: Gridfin — final English landing copy (phase 3)
status: for Katya's review (2026-08-02)
source: landing-copy.md (EN variants) + docs/marketing/seo/2026-07-31-keyword-research.md (§4, §7)
phase: A (beta) — offer "free for beta testers, founding $10 later"
tone: same per-block mix as RU — hero/problem/steps/box/fit A, quality B (+A list), price B, footer A
seo-note: authored for EN clusters, not translated from RU; H1 deliberately avoids the category cliché "…your AI agent {builds on|deserves}" (already used by MakerKit and Supastarter)
---

# Gridfin landing copy (EN) — final for review

## SEO fields

- **seo.title** (52): `Gridfin — Agent-Native SaaS Starter Kit for Claude Code`
- **seo.description, phase A** (~157): `A Next.js SaaS starter built for Claude Code: spec-driven workflow, enforced tests and quality gates. Ship your side project fast — free while in beta.`
- **seo.description, phase B** (~156): `A Next.js SaaS starter built for Claude Code: spec-driven workflow, enforced tests and quality gates. Ship your side project fast — without vibe-code chaos. $10.`
- **seo.slug**: `/en/` (canonical root, x-default)

---

## 1. Hero — variant A

> **Badge:** Early access — free for beta testers
>
> # Ship a real SaaS with Claude Code. Not a demo — a tested app.
>
> Gridfin is an agent-native SaaS starter kit for Claude Code: a lean Next.js
> skeleton with specs, tests and quality gates built in. One command starts an
> onboarding agent that takes you from a raw idea to a running, test-covered
> app — in about an hour.
>
> **CTA:** Get early access
> **Sub-CTA note:** Free while in beta · founding price will be $10

## 2. Problem → solution — variant A (vibe-coding pain added)

> ## An empty repo is where ideas go to stall
>
> - **40 decisions before the first line.** Stack, auth, folder structure, test
>   setup, CI — a week is gone before your idea shows up on screen.
> - **An agent without a process produces chaos.** Claude Code is brilliant at
>   features and careless with architecture: vibe coding gets you a prototype
>   fast — and a mess even faster. Every session reinvents the project.
> - **"Tests later" means never.** When an AI writes most of your code, untested
>   means unknown. You can't ship what you can't trust.
>
> **Gridfin fixes the process, not just the boilerplate.** The invariant parts
> are pre-built and pre-decided. Everything about _your_ product is spec'd
> first, then built, then tested — by an agent that follows the same rules
> every session.

## 3. How it works — variant A (spec-driven phrase anchored)

> ## One command: `/gridfin`
>
> 1. **Idea.** The agent interviews you about your idea — or helps generate and
>    stress-test one if you're starting blank.
> 2. **PRD.** Problem, user, 3–5 core features, and an explicit "not in v1" list.
> 3. **Specs.** Written specifications for your first features — before any code.
> 4. **Adaptation.** Project name, branding tokens, a database schema shaped to
>    your domain.
> 5. **Gridfin.** `pnpm dev`, a smoke check by the agent, and a map of what to
>    do next. Every step is committed — nothing is lost if a session ends.
>
> This is spec-driven development with Claude Code — enforced by the box, not
> suggested by a README.

## 4. What's in the box — variant A (CLAUDE.md, hooks, subagents added)

> ## What's in the box
>
> **A lean skeleton** — Next.js + TypeScript, Tailwind + shadcn/ui, Drizzle +
> Postgres, auth wiring, design tokens, CI. Only the invariants — your product
> is generated around them, not squeezed into someone else's dashboard.
>
> **An agent toolkit** — `/gridfin` onboarding plus focused skills for daily
> work: `feature` (spec → build → test → review), `review`, `verify`, `deploy`.
> The rules live in CLAUDE.md; hooks and subagents keep the agent honest when
> it's tempted to cut corners. Few skills, each self-contained. No skill zoo.
>
> **Playbooks** — step-by-step plans your agent executes when you're ready:
> deploy (Vercel + managed Postgres), Stripe billing — and business ones:
> pricing, landing page, analytics, compliance, AI integration.

## 5. Quality as a feature — variant B + list from A

> ## The uncomfortable question: would you ship what your agent wrote yesterday?
>
> Most AI-built projects can't answer that. Gridfin is built so you can: every
> feature goes spec → build → **test** → review, and quality gates block
> anything red. These are tests your agent can't skip:
>
> - **Three levels pre-wired:** unit & component (Vitest + Testing Library),
>   API integration (real test database), end-to-end (Playwright, desktop +
>   mobile).
> - **Tests are a mandatory step** in the feature cycle — the agent proves each
>   test can fail before it counts.
> - **One CI pipeline** runs everything. Red means not merged. No exceptions.
> - Pairs with **qa-pilot** (our free QA plugin) for deep audits and exploratory
>   testing — the project profile ships pre-filled.

## 6. Built for you / not for you — variant A (side project, indie hacker added)

> ## Built for you if…
>
> - You're a developer (or QA / DevOps / backend engineer) who already uses
>   Claude Code and wants to ship a side project over a weekend, not after a
>   setup week.
> - You believe specs and tests aren't bureaucracy — they're how indie hackers
>   ship fast without drowning later.
> - You'd rather own a real repo than rent a no-code platform.
>
> ## Not for you if…
>
> - You've never touched a terminal — tools like Lovable or Bolt will serve you
>   better today.
> - You want a pre-built dashboard with 50 features to customize. Gridfin ships
>   a process, not a product demo.
> - You expect hands-on support. You get the box, the updates, and the docs.

## 7. Price (phase A — beta) — variant B

> ## The deal
>
> You test it, I fix it. Beta testers run `/gridfin` on a real idea, tell me
> where it stumbles, and keep the kit — with all future updates — for free,
> forever. After beta it launches at a founding price of $10, one-time, and
> that number only goes up from there.
>
> **CTA:** I'm in — give me access

## 8. FAQ (tone A; supastarter, free-version and spec-driven items added)

> **How is this different from ShipFast, MakerKit or supastarter?**
> Boilerplates sell pre-built code you customize — even the agent-ready ones
> hand Claude Code a codebase and wish it luck. Gridfin sells a process: a thin
> skeleton plus an agent workflow that specs, builds, and tests _your_ product.
> You're not deleting someone else's dashboard — you're growing your own.
>
> **Is there a free version on GitHub?**
> There are plenty of free Claude Code starters — files without a process.
> Gridfin's value is the tested end-to-end path: onboarding, skills, the test
> harness and the playbooks are designed to work together and verified on a
> golden path in CI. That's what the $10 buys.
>
> **What is spec-driven development with Claude Code?**
> Every feature starts as a written spec the agent drafts with you; code and
> tests follow the spec, and review checks against it. It's the difference
> between steering an agent and cleaning up after one.
>
> **Do I need to be an experienced developer?**
> You need basic comfort with a terminal and git. You don't need fullstack
> experience — the box carries the architecture, the stack decisions, and the
> testing discipline for you.
>
> **What exactly do I need installed?**
> Node.js, pnpm, Docker, and Claude Code. The bootstrap script checks
> everything and tells you what's missing.
>
> **Is there support?**
> Updates — yes, for everyone, forever. Hands-on support — no promises: it's a
> $10 kit, not an agency. GitHub Discussions are open and I answer as I can.
>
> **Does it work with Codex or other agents?**
> Today the guaranteed experience is Claude Code. The repo follows AGENTS.md
> conventions, so other agents can read it — full Codex support is on the
> roadmap.
>
> **Can I use it for client projects?**
> Yes — build anything you want with it. The only restriction: don't resell or
> redistribute the kit itself.

## 9. Footer — variant A

> Built by the maker of [qa-pilot](https://github.com/grooownow/qa-pilot) — a
> free QA copilot plugin for Claude Code.
> Questions → [email] · Demo repo → [github]

---

## Keyword check against the SEO research (§7)

All must-haves present: Claude Code (H1-adjacent + every block) · SaaS starter
kit (hero, seo.title) · boilerplate (problem, FAQ) · Next.js · TypeScript
(box) · agent-native (hero, seo.title) · spec-driven development (block 3
closing line + FAQ, exact phrase) · tests / Vitest / Playwright (block 5) ·
quality gates (block 5, description) · hooks (block 4) · ship fast / ship a
SaaS (H1, block 6) · ShipFast alternative angle + supastarter (FAQ #1) · side
project (hero-adjacent, block 6, description) · indie hacker (block 6) ·
CLAUDE.md, skills, subagents (block 4) · $10 / one-time (price, FAQ).
H1 avoids the "…your AI agent {builds on|deserves}" cliché per §3 conclusion.

## Diffs vs landing-copy.md (for review)

1. Gridfin → **Gridfin** everywhere.
2. Hero sub rewritten: "agent-native SaaS starter kit" + "specs, tests and
   quality gates built in" moved up into the first screen (main EN cluster).
3. Block 2: vibe-coding pain added to pain #2.
4. Block 3: closing line anchors the exact phrase "spec-driven development
   with Claude Code" (live autocomplete query, no product ranks for it).
5. Block 4: CLAUDE.md / hooks / subagents added (ecosystem markers).
6. Block 5: B heading + A list, bridged by "tests your agent can't skip"
   (unclaimed positioning phrase from the research).
7. Block 6: "side project over a weekend", "indie hackers" added.
8. FAQ: first item now names MakerKit and supastarter; two new items ("Is
   there a free version on GitHub?", "What is spec-driven development…") from
   the research's PAA-style suggestions; both double as objection handling.
9. SEO fields in an explicit block with phase A/B description variants.
