# Gridfin Step 1 — Interview reference

Question bank and procedures for the idea step. Ask ONE question per message,
in the user's language. Adapt wording to context — these are shapes, not
scripts to read verbatim.

## Before the first question: hypothesize out loud

Write your current best read of what the user wants, in one sentence, with an
honest confidence number:

```
HYPOTHESIS: You want a way to invoice translation clients without a
            spreadsheet, and "a CRM" was the convention that came to mind.
CONFIDENCE: ~30% — missing: who else touches the invoice, and what "done"
            looks like for them
```

Below ~70%, append what is still unresolved on the same line. The number
forces honesty: if you cannot predict the user's answer to the next three
questions you would ask, the number is too high.

Re-state the hypothesis and the number once the interview ends, before the
fit check. Stop asking when you reach ~95% — that is the stop condition, not
"I ran out of questions in the bank".

## Question format

Every question carries your guess at its answer:

```
Q: Who reaches for this first — one concrete person, not a segment?
GUESS: A solo translator with 5-15 recurring clients, because you said
       "invoice" and not "billing platform".
```

A guess gets corrected. A bare question gets "hmm, good question". The guess
is also how you show your work: a wrong guess tells the user exactly which
assumption to shoot down.

## Branch A — the user has an idea

Get their pitch first, then fill the four slots the idea template needs. Skip
any question the pitch already answered — never ask what you were just told.

1. **Pitch:** "Tell me the idea in a sentence or two — what is it, for whom?"
2. **User:** "Who exactly reaches for this first? Describe one concrete
   person (role, situation), not a market segment."
3. **Pain:** "What does that person suffer through today, the week before
   they'd find your product? Be specific about the moment it hurts."
4. **Alternative:** "What do they use today instead — a competitor, a
   spreadsheet, a group chat, or just suffering through it?"
5. **Wedge:** "Why would they switch? What's the one thing this does clearly
   better than that alternative?"

Follow-ups are allowed (still one per message) when an answer is too vague to
write a PRD from — e.g. "everyone with this problem" → push for one persona.
Don't interrogate past usefulness: 5-8 questions total is the norm, and the
real stop condition is ~95% confidence in the hypothesis, whichever comes
first. Every question above carries a GUESS, per the format section.

## Branch B — the user has no idea

1. Ask (one at a time, stop early once you have enough signal):
   - "What domains do you know from the inside — work, hobbies, communities?"
   - "What audience can you actually reach — who already listens to you?"
   - "Any constraint I should respect — B2B vs B2C, solo-maintainable,
     a revenue timeline?"

   Each of these carries a GUESS too — a guessed domain the user can correct
   is worth three open-ended prompts.

2. Generate **3 candidates**, each filled into the section structure of
   `docs/templates/idea.md` (pitch, user, pain, alternative, wedge, risks).
   Favor niches the user named — insider knowledge is the moat a solo founder
   actually has. Run the fit check (below) on every candidate **before**
   offering it — replace any candidate that fails; never present an unfit
   candidate to the user.
3. Score each candidate 1-5 on the template's rubric (pain, reach,
   feasibility, moat) with a one-line "why" per score. Score honestly —
   a spread of totals is useful, three 17/20s are not.
4. Present a compact comparison table (candidate, one-line pitch, total
   score, biggest risk) and ask ONE question: "Which one do we run with —
   1, 2, 3, or none (I'll generate a fresh set once)?"
5. If none: ask what was off about all three, generate one fresh set using
   that answer, and present again. If still none, say honestly that idea
   generation isn't converging, suggest they return when something clicks,
   and stop the flow (no commit needed — nothing was produced).

## Fit check (hard gate — run before writing docs/idea.md)

Gridfin builds **server-rendered web apps**: Next.js + Postgres, auth,
forms, dashboards, CRUD over a domain model, billing-ready. A great fit:
SaaS tools, member portals, marketplaces-lite, internal tools, content
products with accounts.

Not a fit — stop the flow honestly if the idea's **core value** requires:

- a **native mobile app** (App Store presence, offline-first, push-first UX;
  a responsive web app being "nice on phones" is fine),
- an **ML pipeline** (training models, heavy data processing; _calling_ an
  LLM API for a feature is fine — see `docs/playbooks/ai-integration.md` if
  present),
- **realtime-heavy** interaction (multiplayer games, live cursors,
  video/audio calls; occasional polling or refresh-on-action is fine),
- **hardware/embedded/desktop** software, or anything else that is not a
  web app at heart.

When it fails, say so plainly (user's language), in this shape:

> Honest answer: Gridfin isn't built for this. The core of this idea is
> <mobile/ML/realtime/...>, and this template is a server-rendered web-app
> stack — I'd be scaffolding something that fights its own foundation.
> Gridfin shines for <closest fitting reframe, if one exists>: if a version
> of your idea works as a web app first, I can build that. Otherwise you
> need a different starter, and it's better to know now than after a week.

Offer the web-first reframe **only** if one genuinely preserves the idea's
value; if the user accepts a reframe, re-run the fit check on the reframed
idea, then continue. Never scaffold the unfit original.

## Writing docs/idea.md

One idea = one file: fill the template's sections for the chosen idea. If
candidates were generated, keep the scoring table of all three at the bottom
(it's the paper trail for "why this one") and note which won. English, even
if the interview happened in another language.
