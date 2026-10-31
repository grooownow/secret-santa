---
name: design
preamble-tier: 2
description: Runs the visual loop for one surface — establishes docs/design.md as the token contract (read out of globals.css and components.json, never invented), explores 3-5 genuinely different static mockup variants and opens them side by side in a real browser, records the user's pick and their own words into a taste profile that decays 5% a week, then builds the winner from the installed shadcn primitives and critiques it at 375/768/1280 with a screenshot behind every finding. Use when the user wants mockups or variants of a screen, a look-and-feel or layout decision, a typography or spacing pass, or a breakpoint check of a page they already built. NOT for building a whole roadmap slice with its spec and tests (that is feature) and NOT for choosing the product itself (that is gridfin).
---

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->

# Design

Most agent design work fails the same way: the agent writes the first layout that
occurs to it, calls it clean and modern, and the user — who cannot articulate what
they wanted but knows this is not it — accepts it because arguing is expensive.
This loop replaces that with a choice. Several real options, seen side by side, in
a browser, at the same moment. The user picks. The pick is evidence, and evidence
is the only thing about taste that is worth writing down.

## Ground rules

<!-- Generated from the shared preamble (scripts/lib/codegen.ts). Edit it there, not here. -->

- **Language:** chat with the user in the project's chat language
  (`docs/manifest.md` → _Chat language_; falls back to the language of the
  user's messages while unset). Every artifact that lives in the repo — code,
  docs, commit messages — is English.
- **Evidence, not adjectives.** Never report a command as green without quoting
  the line that proves it. "It should pass" is not a result, and the word
  _should_ in a status line is a red flag about your own honesty.
- **The hard invariants** (`CLAUDE.md`), which a `PreToolUse` hook
  (`scripts/hooks/pretooluse.ts`) enforces at the moment of the write — do not
  design around them, and do not treat a hook denial as a puzzle to route
  around:

  1. No internal `<a href>`/`window.location` navigation — always `<Link>`.
  2. No network/db call in `src/middleware.ts` — the JWT check stays local.
     Applies only once the `persistence` module is installed (`src/middleware.ts`
     does not exist in a Landing-preset project).
  3. No feature ships without a test proven able to fail.
  4. Every server action/route validates input with `zod` before use.
  5. Every commit follows Conventional Commits (one exception: `/gridfin`
     onboarding commits — see `docs/rules/git.md`).
  6. UI colors come from the design tokens in `src/app/globals.css` — no
     hardcoded hex/rgb/hsl or arbitrary-value color classes in components
     (Next metadata images are exempt; see `docs/rules/frontend.md`).

- **Read the rule that governs the step you are on, at the moment you reach it** —
  not from memory, and not all of them up front:

  - `docs/rules/architecture.md` — new routes, feature slices, data access, import direction, schema changes.
  - `docs/rules/definition-of-done.md` — every change, without exception — this is the standing bar, and the one rules file that is never out of scope.
  - `docs/rules/docs.md` — any change to `docs/`, `CLAUDE.md`/`AGENTS.md`, or a decision worth remembering across sessions. Docs are the interface between agent sessions — stale docs are worse than missing ones.
  - `docs/rules/frontend.md` — any page, component, mutation, or loading state — responsiveness is an invariant here, not a nice-to-have.
  - `docs/rules/git.md` — every commit, branch, and merge in this repo.
  - `docs/rules/modules.md` — any `modules/<name>/` directory and any skill that installs one.
  - `docs/rules/security.md` — every server action, route handler, env var, and auth-adjacent change — this is baseline, not opt-in.
  - `docs/rules/skills.md` — any change under `.claude/skills/**`, `.claude/skill-steps/**`, or the compiler that builds them (`scripts/lib/codegen.ts`, `scripts/gen-skills.ts`). The skills are the product — this is the contract they are written against.
  - `docs/rules/sources.md` — any line of code or prose that asserts how a third-party framework, library, or API behaves.
  - `docs/rules/testing.md` — every code change — no feature is done without tests.

- **Never invent a token.** Every color, radius, font and spacing step comes from
  `src/app/globals.css` and the installed components. If a mockup needs a token
  the project does not have, that is a finding to raise with the user, not a hex
  code to type.
- **The variants must actually differ.** Five recolours of one layout is one
  variant with a paint job, and it teaches the user's taste profile nothing.
- **One question per message.** A design question the user has to unpack into
  four answers gets one answer and three shrugs.
- **The pick is the human checkpoint** (Step 3). Mockups live in gitignored
  `.design/`, so a session that drops before the answer resumes by rebuilding
  the board — never by guessing which variant they were leaning toward.
- **Every fix-and-retry loop is bounded: two honest attempts at the same
  failure, then stop.** Report the exact command output, the state you are in,
  and what you would try next; let the user decide. A third attempt on the same
  red gate is not persistence — it is where you start changing code you have
  stopped understanding, and where a real failure gets buried under repair
  attempts.
- **A loop that waits on a person is not bounded by that budget** — it ends
  when they answer. It owes something else instead: say, before you ask, where
  the flow resumes if the session drops before the answer arrives.

## What this loop cannot do — say so before the user assumes otherwise

- **No image generation.** There is no image model wired into this repo. A
  "mockup" here is static HTML rendered in a real browser, which is more honest
  than a picture anyway: it uses the project's real tokens and it cannot depict a
  layout the framework cannot build.
- **No design-tool import.** Nothing reads Figma. If the user has a reference,
  ask them to describe it or paste a screenshot into the chat.
- **No pixel diffing.** Findings come from what a screenshot and the DOM show,
  not from a visual-regression baseline. This skill produces judgement, not a
  golden-image gate.

## Step 1 — The design SSOT (`docs/design.md`)

Read it if it exists. If it does not, build it **by reading the code**, then show
the user the draft before writing it:

- **Tokens** — the CSS custom properties in `src/app/globals.css` (`--background`
  / `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`,
  `--border`, `--ring`, `--card`, `--popover`, the `--chart-*` and `--sidebar-*`
  families) and the Tailwind utilities they back (`bg-background`,
  `text-muted-foreground`, …). Record the pairs — a `bg-*` and its matching
  `*-foreground` — because those pairs are what carries contrast.
- **Radius scale** — one `--radius` with the rest derived from it. Note the
  multipliers; a mockup that hand-rolls a radius has left the system.
- **Type + spacing** — the font variables in the `@theme` block and the Tailwind
  spacing steps the existing pages actually use. Read `src/app/page.tsx` and the
  dashboard: the scale in use is more truthful than the scale available.
- **Components already installed** — list `src/components/ui/`. This is the
  hard boundary of what a mockup may promise. Adding a shadcn primitive is a
  decision the user makes, not a side effect of a mockup.
- **Themes** — light and dark come from the same token set (`next-themes`, the
  `.dark` class). A design that only works in one of them is broken, not
  half-done.
- **Responsiveness invariants** — link `docs/rules/frontend.md` rather than
  restating it. Two copies of a rule is two rules that will disagree.

`docs/design.md` is the contract the review step in Step 6 judges against. A
review with no contract is an opinion.

## Step 2 — Shotgun: 3-5 variants that genuinely differ

Ask what surface, and what it is for (one message). Then **load the taste
profile** — `preferences(load(io).profile, Date.now())` from `scripts/lib/taste`,
via the same throwaway script Step 4 uses — and let it _bias_ the spread. Bias,
not dictate: a preferred trait earns one more variant that leans into it and one
that deliberately does not, because a loop that only offers what was picked last
time has stopped asking.

Generate each variant as a standalone HTML file in `.design/<surface>/` (this
directory is gitignored — mockups are a conversation, not an artifact). Each one
loads the real stylesheet, so the tokens on screen are the tokens in production.

Make them differ along **axes**, and name the axis in the file — density,
information hierarchy, navigation shape, whether the primary action is committed
to or deferred, whether the page leads with data or with words. Those are the
things a user has an opinion about. Colour is not an axis; it is the thing you
already do not get to choose.

## Step 3 — The comparison board

Write `.design/<surface>/board.html`: every variant in an iframe, side by side,
labelled A/B/C, with its axis under it. Open it in a real browser with the
Playwright tooling and screenshot it. Then ask, in one message:

> Which one, and what is wrong with it?

The second half of that question matters more than the first. "B, but the header
is shouting" is two signals; "B" is one, and the weaker one.

Iterate once: fold the feedback into the winner, regenerate, show the pair
(before / after) on the board, confirm. Stop there unless the user asks for more —
a third round is usually the agent enjoying itself.

## Step 4 — Record the pick, in the user's own words

Signals are traits, not variants: `dense-tables`, `muted-accent`,
`generous-whitespace`. "Variant B" transfers to no other screen. Record the
rejections too — a trait the user actively dislikes is more actionable than one
they merely tolerated.

Write `.design/record.ts` and run it with `pnpm exec tsx .design/record.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { record, type TasteIO } from "../scripts/lib/taste";

const io: TasteIO = {
  read: (f) => {
    try {
      return readFileSync(f, "utf8");
    } catch {
      return null;
    }
  },
  write: (f, text) => writeFileSync(f, text),
  now: () => Date.now(),
};

record(io, {
  trait: "dense-tables",
  verdict: "approved",
  surface: "dashboard",
  note: "I can see more rows without scrolling", // the user's words, verbatim
});
```

`docs/design-taste.json` is committed; the weights decay 5% per week, so a
preference has to keep being re-confirmed to keep governing. Do not "tidy" the
file by merging two records of the same trait into one with a bigger weight —
that produces the same number today and destroys the history the decay maths
runs on.

Never paraphrase the note. The paraphrase is where the taste goes.

## Step 5 — Implement the winner

Real components, in the project's own system — see `docs/rules/frontend.md` and
`docs/rules/architecture.md` for where the files go.

- shadcn primitives from `src/components/ui/` and Tailwind utilities bound to the
  tokens. No raw hex, no `text-gray-500`, no arbitrary values.
- Internal navigation is `<Link>`. The `PreToolUse` hook denies the write if you
  reach for an `<a href>` — that is invariant 1 doing its job, not an obstacle.
- A route with an async data dependency ships a `loading.tsx` skeleton shaped
  like the real content.
- A new mutating form is optimistic, or documents why it is not.

A mockup is HTML with no state, a real page has empty, loading, error and
too-much-data states. The mockup did not design those; you have to.

If this is a whole feature rather than a re-skin, this step belongs to the
`feature` skill — hand the winner over as its design input rather than building a
slice here without a spec.

## Step 6 — Design review at three breakpoints

Load the built page (`pnpm dev`) in a real browser at **375**, **768** and
**1280**, screenshot each, and judge against `docs/design.md` and
`docs/rules/frontend.md`. Look for:

- Layout: overflow, horizontal scroll, collapsed or orphaned columns, text that
  wraps into two words per line, a nav that vanishes on mobile without replacement.
- Tokens: any color, radius or font that did not come from the system.
- A11y: a visible focus ring on every interactive element, an accessible name on
  every icon-only control, tap targets a thumb can hit, contrast that comes from a
  token pair rather than a hand-picked foreground.
- The mockup's promise vs the page's reality — the states from Step 5.

**The confidence gate** (the same discipline the `review` skill runs on a diff):
score each candidate finding on how sure you are it is real. **If you cannot point
at it in a screenshot or quote it from the DOM, it is dropped — not softened, not
filed under "worth a look".** A design report of four findings you can see beats
one of four you can see and six you imagined, because the second one has to be
checked before it can be used.

Report each finding with the breakpoint, the screenshot, what it violates, and the
fix. Then offer to fix — one question, listing what would change. Run `pnpm lint`
after any fix and quote the result; `verify` is what closes the branch.

## Common rationalizations

| Rationalization                                               | Reality                                                                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The user will not want to look at five options"              | They want to look at five options far more than they want to relitigate the one you picked for them. The pick is the only real taste signal this loop ever gets. |
| "The variants differ enough — different accent, tighter grid" | Colour is not an axis; you do not get to choose it. If two variants would get the same answer to "which one, and what is wrong with it?", you built one variant. |
| "This design needs a color the system does not have"          | Then the system needs it, and that is a decision the user makes in the open. A hex code typed into a component is a design system with a hole in it.             |
| "I will screenshot desktop; the others are the same layout"   | They are not, and that is the entire point of a breakpoint. Three widths, three screenshots, or the review did not happen.                                       |
| "It looks a bit cramped on mobile"                            | Point at it. A finding you cannot show in the screenshot you took is dropped, exactly as it would be in a code review.                                           |
| "I will note the preference in my head for the rest of this"  | Your head ends when the session does. It goes in the taste profile, in the user's words, or it never existed.                                                    |
| "The taste file says minimal, so I will only build minimal"   | The profile biases the spread, it does not collapse it. A loop that only ever offers what was picked last time is a fossil with a decay function bolted on.      |
| "The mockup is approved, so the component is done"            | The mockup has one state. The page has empty, loading, error, and far-too-much-data. Nobody approved those, because you never showed them.                       |

## Red flags

- A mockup with a hex code, an arbitrary Tailwind value, or a component the repo
  does not have installed
- Variants that would all get the same answer to "what is wrong with it?"
- A comparison board described in prose but never opened in a browser
- A taste signal recorded as `variant-b`, or with the user's words paraphrased
- Editing `docs/design-taste.json` by hand, or merging two records into one
- A breakpoint review with one screenshot
- A finding you cannot point at in the screenshot you took
- `docs/design.md` written from what the tokens _should_ be rather than from
  `src/app/globals.css`
- Mockup files committed — `.design/` is gitignored for a reason
