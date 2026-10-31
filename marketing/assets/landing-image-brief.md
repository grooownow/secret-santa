# Landing Image Brief

Generated for RU v2 landing skeleton on 2026-08-06.

## Source Context

- Layout reference: `/Users/ekaterinapustovaa/Downloads/RU v2 — Skeleton.png`
- Copy source: `docs/marketing/landing-copy-ru-final.md`
- Product canon: `docs/marketing/gridfin-product-canon.md`
- Working v2 direction: `docs/marketing/2026-08-05-landing-copy-v2-ru-draft.md`

## Visual Requirements

Gridfin should look like an engineered workflow for Claude Code, not like a
generic AI product. The images should communicate:

- controlled development process;
- real repository ownership;
- specs, tests, reviews, hooks, and quality gates;
- calm technical confidence;
- beta-stage honesty, without fake social proof.

Avoid:

- readable in-image text;
- visible brand logos;
- robot/AI mascot imagery;
- neon cyberpunk excess;
- generic corporate stock scenes;
- dashboards that imply a hosted SaaS service instead of a repo/process.

## Generated Assets

### `gridfin-landing-hero-terminal.png`

Use in the hero visual slot. It supports the H1:

> Запускайте качественные сайты и приложения с Claude Code.

Rationale: a dark, focused laptop/code scene matches the current hero card,
keeps enough contrast for an overlaid `/gridfin` command chip, and signals
engineering discipline without adding fake UI claims.

Suggested crop: 4:3 or wide card, right/center anchored.

### `gridfin-landing-trust-review.png`

Use in the trust block around "Коробка остаётся с тобой".

Rationale: the image shows a practical review/work session around a laptop and
notes. It supports the message that the buyer gets a usable repository and a
repeatable process, not a disappearing hosted service.

Suggested crop: 4:3 horizontal card, left/center anchored.

## Prompt Notes

Both prompts used the landing PNG as a style/layout reference only. Generated
images are new assets, not edits of the mockup.

The prompts intentionally required no readable text. Any terminal commands,
feature labels, or product claims should be added in HTML/CSS where they can be
localized and changed safely.
