---
title: Gridfin — EN landing copy v2 (mirror of the approved RU v2)
status: draft for Katya's review (2026-08-06); RU v2 approved same day is the source of truth
structure: Hero → Bridge → Problem → How → Why → What you get → Trust → Fit → Pricing → FAQ
placeholders: prices (🟣 open question #1) · beta feedback format (🟣 #3)
notes: the Russia FAQ item is RU-specific and intentionally omitted here → 8 FAQ items
---

# Gridfin EN landing v2

## SEO fields

- **seo.title** (52): `Gridfin — Claude Code SaaS starter with quality gates`
- **seo.description** (~150): `Gridfin turns an empty repo into an Application Skeleton for Claude Code: specs, tests and quality gates built in. Launch a quality SaaS or pet project — not tech debt.`
- **seo.slug**: `/en/`

---

## 1. Hero

> **Badge:** Early access — free for beta testers
>
> # Launch quality sites and apps with Claude Code.
>
> Gridfin turns an empty repository into an Application Skeleton — a
> ready-made architectural foundation for building with Claude Code.
> Specifications, engineering rules, tests and quality gates are already
> inside — instead of chaotic vibe coding.
>
> If you have an idea and Claude Code, but not years of engineering
> experience — Gridfin walks you through a process that engineering teams
> usually take years to assemble.
>
> **CTA:** Get early access
> **Note:** Free during the beta · founding prices after 🟣

## 1a. Hero → Problem bridge (one sentence, its own line)

> **AI made development faster. But engineering experience still can't be
> generated. That's the gap Gridfin closes.**

## 2. Problem — four pains

> ## Without engineering experience, mistakes are invisible — until they get expensive
>
> **You don't know which mistakes you're already making.** Stack,
> architecture, testing, security — dozens of decisions get made silently,
> blind.
> → Gridfin makes the engineering decisions upfront: the invariants are
> pre-decided and reused in every project.
>
> **Every new feature breaks the previous ones.** Building was fast,
> debugging is endless; you fix one thing — another breaks.
> → Every feature goes through the same cycle: spec → code → tests →
> review. The old tests keep a new feature from silently breaking the rest.
>
> **Every new feature costs more than the last.** Constraints you never
> knew about start surfacing; the agent rewrites half the code over a small
> change.
> → The Application Skeleton locks the architecture from day one: the
> twentieth feature lands through the same process as the first.
>
> **Claude Code writes code faster than you can review it.** Nobody has
> actually read what it generated yesterday.
> → Hooks and quality gates make review part of the process: a rule
> violation is stopped before the code is written, and red status is
> visible before merge.

## 3. How it works

> ## What happens after you run Gridfin
>
> One command — `/gridfin` — starts your guide agent:
>
> 1. **Idea.** The agent interviews you, sharpens the idea — and says
>    honestly if it doesn't fit this stack.
> 2. **Specification.** A PRD: the problem, the user, 3–5 key features and
>    an explicit "not in v1" list. Specs come before any code.
>    *(design note: this step gets visual emphasis — it is Gridfin's core
>    idea and currently blends into the six-step row)*
> 3. **Your Application Skeleton is ready.** The main result of the first
>    steps: architecture, stack, tests and CI already assembled — and
>    adapted to you: project name, brand tokens, your domain model's data
>    schema.
> 4. **Features through skills.** `/feature` takes every feature through
>    spec → code → tests → review.
> 5. **Quality gates.** Lint, tests, e2e and build in a single run — red
>    is visible before merge.
> 6. **A production-ready app.** Deploy to Vercel by a step-by-step
>    playbook. Every step is committed — a dropped session loses nothing.

## 4. Why it works — four cards

> ## Why it works
>
> **Engineering decisions are made once.**
> Stop re-making the same decisions — they are already made, tested and
> reused.
>
> **Specifications come first.**
> AI writes better code when it knows what it's building first.
>
> **AI follows engineering rules.**
> The rules are enforced automatically — by hooks and gates, not by wishes
> in a README.
>
> **Every change passes quality gates.**
> Quality is a mandatory part of the process, not the last item before
> release.

## 5. What you get

> ## What you get
>
> Everything you need to start a new project without rebuilding the
> engineering infrastructure.
>
> **Application Skeleton** — a ready-made architectural foundation for
> your app (Next.js + TypeScript + Postgres). Living inside it:
>
> AI skills · Playbooks · Engineering rules (CLAUDE.md) · Hooks ·
> Testing infrastructure · Quality gates · Documentation
>
> Plus lifetime updates. It's a git repository that belongs to you. Not a
> subscription, not a service, not a rented site builder.
>
> **More ideas than weekends?** One kit — any number of projects: SaaS,
> landing pages, pet projects. Every launch is an hour with the agent, not
> a week of setup.

## 6. Trust — three cards

> ## Yours means yours
>
> **The repository belongs to you.** This is not SaaS: the code, the rules
> and the process stay with you and keep working even if Gridfin the
> product disappears.
>
> **Updates — for life.** The template is versioned; the `/update` command
> pulls new releases into your project without clobbering your code.
>
> **Gridfin is honest about what it can't do.** An idea outside its
> profile gets declined at step one, not after a week of work. No
> "fits everything" promises.

## 7. Fit

> ## Best fit if…
>
> - You have an idea and Claude Code, but no full-stack experience — and
>   you want to launch your project over a weekend, not after a week of
>   setup.
> - You're a solo developer, QA, DevOps engineer or designer — and you
>   believe specs and tests are speed over distance, not bureaucracy.
> - You want a real repository of your own, not a no-code platform.
>
> ## You might be better served elsewhere if…
>
> - You've never opened a terminal — today Lovable or Bolt will fit you
>   better.
> - You expect a ready-made dashboard with 50 features to customize —
>   Gridfin is a process, not a product demo.
> - You need a different stack — Gridfin is deliberately not a
>   constructor.

## 8. Pricing

> ## Early access terms
>
> **Beta: you test — I fix.** Run `/gridfin` on a real idea and tell me
> where you stumbled 🟣(feedback format — open question #3) — the kit is
> yours forever, with all future updates, free.
>
> **After the beta** — founding prices that only go up from there:
> **Gridfin Landing — $🟣 · Gridfin App — $🟣** (open question #1).
>
> **CTA:** I'm in — give me access

## 9. FAQ — eight questions

> **Why not just Claude Code?**
> Claude Code writes brilliant code — and knows nothing about your
> process. Without rules, every session re-decides how to build the
> project, and decides differently. Gridfin gives the agent a process:
> specs before code, tests as a mandatory step, hooks and gates it can't
> quietly bypass.
>
> **How is this different from boilerplates — ShipFast and the rest?**
> Boilerplates sell pre-built code that you customize. Gridfin is an
> agent-native starter kit: a thin skeleton plus a process that specs,
> builds and tests your product specifically. You don't carve up someone
> else's dashboard — you grow your own.
>
> **What is an Application Skeleton?**
> It's not just a project template. It's a pre-assembled architectural
> foundation with the engineering decisions already made — stack,
> structure, tests, CI — that all further development is built around.
>
> **How is this different from MakerKit and Supastarter?**
> They added AI-agent rules files to a boilerplate — but the agent isn't
> obliged to follow them. In Gridfin the rules are enforced: a hook stops
> a violation before the code is written, and the gates don't let red
> through. Rules with teeth, not wishes.
>
> **Why is the stack fixed?**
> Because the whole process — rules, hooks, tests, gates, playbooks — is
> proven on exactly this stack: Next.js + TypeScript, Tailwind +
> shadcn/ui, Postgres. Stack freedom means another forty decisions you'd
> have to make without the experience.
>
> **Can I use my own stack?**
> No — deliberately. Gridfin is not a constructor: remove the fixed stack
> and everything it vouches for disappears — the proven rules, tests and
> gates. If you need a different stack, the honest answer is: Gridfin
> isn't your tool.
>
> **What if the project stops being developed?**
> Nothing dramatic: the repository is yours, the code and the process run
> locally and don't depend on Gridfin existing as a product. Updates would
> stop arriving — everything else stays.
>
> **Is it for beginners?**
> If you're ready to work with the terminal, git and Claude Code by
> step-by-step instructions — yes: the box carries the architecture, the
> testing strategy and the quality control for you. If you're seeing a
> terminal for the first time — start with Lovable or Bolt.

## 10. Footer

> From the author of [qa-pilot](https://github.com/grooownow/qa-pilot) — a
> free QA plugin for Claude Code.
> Questions → [email] · Demo repository → [github]

---

## Assembly notes (not published)

1. Mirrors the RU v2 approved by Katya on 2026-08-06, including the
   semantic-audit elevation of Application Skeleton (hero, How step 3,
   What-you-get hierarchy, FAQ definition) and all polishing-pass fixes.
2. The Russia FAQ item is RU-specific (Yandex/Wordstat intent) and is
   omitted → 8 questions instead of 9. No EN-specific replacement added:
   Katya's "eight strong questions" rule holds.
3. EN keyword check (research §4, cluster 1): Claude Code (throughout) ·
   starter kit (FAQ-2) · SaaS starter (seo.title) · boilerplate (FAQ-2) ·
   vibe coding (hero) · Next.js (§5, FAQ-5) · tests/specs/quality gates
   (throughout) · agent-native (FAQ-2) · pet project (§5, fit) ·
   solo developer (fit) · spec-driven wording via "specs before code".
4. Placeholders 🟣 — two: prices (#1), beta feedback format (#3). The
   fixed-stack/own-stack answers are approved (RU approve covers the
   stance; EN mirrors it).
