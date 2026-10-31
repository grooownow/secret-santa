---
title: AI features with the Claude API
status: lite
owner: user's agent
---

# AI integration

Domain knowledge for adding an AI feature: when it belongs in v1, the
Claude API quickstart, the three patterns that cover most products, cost
control, and the quality bar. Implementation is a `/feature` run with this
playbook as domain input. **Note:** model ids and pricing evolve — verify
the current model list in Anthropic's docs (docs.anthropic.com) at
implementation time.

## Prerequisites

- An Anthropic API key (console.anthropic.com) — server-side only, never
  `NEXT_PUBLIC_`.
- PRD exists — confirms the AI call is one narrow assist, not the paywall
  itself.

## When AI belongs in v1

One narrow assist inside the core flow — draft this field, summarize this
record, extract structure from this paste — not a platform. If the PRD's
value survives without the AI call, ship v1 without it; never make an
unvalidated AI feature the paywall.

## Quickstart

- **Agent does:** `pnpm add @anthropic-ai/sdk` — not installed yet; add it with the first AI feature.
- API key per `docs/rules/security.md`: add `ANTHROPIC_API_KEY` to the zod
  schema in `src/lib/env.ts`, a commented line in `.env.example`, and a
  case in `src/lib/env.test.ts`. Server-side only — never `NEXT_PUBLIC_`.
- Default model: `claude-sonnet-5` — cost-effective for app features.

## The three patterns

All three run server-side, behind zod input validation (`docs/rules/security.md`).

### 1. Generation (draft / summarize / rewrite)

```ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const msg = await anthropic.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024, // hard output cap = hard cost cap
  system: "You summarize the user's notes in at most 120 words.",
  messages: [{ role: "user", content: validatedInput.notes }],
});
const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
```

### 2. Extraction into a zod schema

Model output is untrusted input — validate it like any other boundary input:

```ts
const Extracted = z.object({ title: z.string(), tags: z.array(z.string()) });
// system prompt: 'Reply with ONLY a JSON object: {"title", "tags"}.'
const parsed = Extracted.safeParse(JSON.parse(text));
if (!parsed.success) return { ok: false, error: "extraction_failed" }; // discriminated union, no raw throw to UI
```

### 3. Chat with history persisted via drizzle

Store turns in a `chat_messages` table (role, content, `userId` FK with
cascade — `docs/playbooks/compliance.md`); replay per call, then insert both new turns:

```ts
import { getDb } from "@/db/client";

const history = await getDb()
  .select()
  .from(chatMessages)
  .where(eq(chatMessages.userId, userId))
  .orderBy(chatMessages.createdAt);
const msg = await anthropic.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  system: [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ],
  messages: [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: validatedInput.message },
  ],
});
```

## Cost control

- **Cache the system prompt** — `cache_control: { type: "ephemeral" }` on
  a stable system block (above) bills cached reads at ~10% of input price;
  keep it byte-stable (no timestamps or user data interpolated).
- **Cap `max_tokens`** per feature to what the UI actually needs.
- **Log usage per user** — write `msg.usage.input_tokens` / `output_tokens`
  to an `ai_usage` table on every call; this feeds the cost-floor worksheet
  (`docs/playbooks/pricing.md`) and flags abusers.
- **Rate-limit the endpoint** — reuse `rateLimit()` from
  `src/lib/rate-limit.ts`, keyed by userId; AI endpoints are the most
  expensive thing a user can hammer.

## Quality bar: golden examples

Keep a fixture set of real inputs with expected outputs ("golden
examples") and assert the deterministic parts in a Vitest `unit` test per
`docs/rules/testing.md` — prompt assembly, extraction validation, error
handling; no live API calls inside `pnpm test`. Re-run the goldens against
the live model with a manual script whenever the prompt or model changes.

## Done when

- The AI feature ships via `/feature` with zod-validated input AND output,
  rate limiting, usage logging, and a golden-examples test able to fail.
