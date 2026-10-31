# Marketing

Everything marketing lives here — the landing source, the copy, the strategy
docs, SEO research, and generated assets. The split is by market segment:
`ru/` and `en/` carry different texts and may carry different strategies;
what genuinely covers both markets sits in `strategy/`.

None of this ships to template buyers: `marketing/` is excluded in
`scripts/export-template.sh`.

## Layout

| Directory   | What goes here                                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landing/`  | The landing source: static-site generator, per-locale content JSON (7 locales, one i18n unit — see its README), supporting pages, tests. Build: `pnpm landing:build`; gate: `pnpm i18n:check`. |
| `ru/`       | RU-segment texts: published RU copy (`landing-copy-ru-final.md`), drafts, the RU editing workdoc.                                                                                              |
| `en/`       | EN-segment texts: published EN copy (`landing-copy-en-final.md`), drafts. EN is also the MT source for de/es/fr/ja/pt-br — those locales belong to this segment strategically.                 |
| `strategy/` | Cross-market canon: product canon, content strategy, intent map, open questions, launch roadmap, GTM plan, i18n brief, landing design system, v2 change list.                                  |
| `seo/`      | Keyword research, rename/rebrand rationale, and the SEO agent's state files (`seo-handoff.md`, `seo-state.json`).                                                                              |
| `assets/`   | Generated images (hero, trust, OG) plus their briefs. Referenced by path from `landing/scripts/build.ts` — renaming a file here breaks the build, which is intentional.                        |

`archive-candidates.md` (repo-level audit of these docs; archival decisions
are the author's) sits at this level because it is _about_ the folder, not
part of any segment.

## Where the landing gets published

The built RU landing is copied by hand into `ludvik4` (the studio site) at
`resources/ru-public/gridfin/` and served at `https://ludvik4.ru/gridfin/`.
ludvik4 holds only the static bundle, never the source — the source of truth
for every string on that page is `landing/content/ru.json` here.

The reviewed EN launch bundle is copied into `ludvik4/public/gridfin/` and
served at `https://ludvik4.dev/gridfin/en`. Copy only the root redirect,
`landing/dist/en/`, shared assets and `landing/dist/en/sitemap.xml` (as the
bundle-root `sitemap.xml`). Other translated locales remain unpublished until
their copy receives a market-quality review.

Legal documents are market-specific: `landing/content/terms.ru.md` belongs
only to the RU host; `landing/content/terms.en.md` is the international beta
agreement governed by Spanish law and links to the `.dev` privacy notice.

## Rules of the road

- New RU-only text → `ru/`. New EN/international text → `en/`. If it covers
  both, it is strategy — put it in `strategy/` and link it from both.
- Landing copy changes go through `strategy/landing-v2-change-list.md`
  (pointwise edits to the final copies), then into `landing/content/*.json`,
  then `pnpm i18n:check` before building.
- Nothing here is deleted without an explicit per-file decision recorded in
  `archive-candidates.md`.
