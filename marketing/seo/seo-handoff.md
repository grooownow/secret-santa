# SEO Handoff

## 2026-08-11 — RU central-entity terminology correction

The Russian landing now follows the accepted product canon: Gridfin is an
agent-native Application Skeleton and managed AI development process, not a
"starter". The RU source title, H1 and hero copy no longer define the product
as a starter. RU SoftwareApplication JSON-LD uses `Application Skeleton for
Claude Code`; EN and the other international locales retain `Claude Code
starter kit` as their market term.

Regression coverage now protects the RU title, H1 and locale-specific schema.
`pnpm i18n:check`, the 59-test landing suite, full lint, all 323 repository
tests and `pnpm landing:build` pass. The generated RU `index.html` is the
publication artifact copied into Ludvik4.

## 2026-08-11 — Gridfin EN launch wave

### Current verdict

The English landing and its two first-wave semantic pages are complete in the
Gridfin source and live in the international Ludvik4 app. The design system
was not changed. Gridfin commits `d6c2f26` and `e52fcb5`, plus Ludvik4 commit
`6390e58`, are published on `main`.

### Completed

- Reused the RU product canon, lifecycle, intent map and “Library, not Blog”
  model, then rebuilt the search framing for an international English buyer.
- Updated the competitive position: agent rules and test support are now
  category features; Gridfin differentiates on its enforceable end-to-end
  process and gate evidence.
- Removed the Russia-specific EN FAQ and replaced it with real runtime
  requirements.
- Isolated form delivery: EN posts same-origin to the existing `.dev` Resend
  pipeline; RU retains its current backend.
- Split the legal surface by market: the existing RU Terms remain RU-only;
  `/gridfin/en/terms` now serves International Beta Terms governed by Spanish
  law, preserves mandatory local consumer rights and links to the existing
  Vercel/Resend privacy notice. No separate US agreement is required merely
  because US visitors can access the site; applicability must be reassessed if
  US state-law thresholds or directed commercial activity change.
- Aligned EN canonical, hreflang and sitemap URLs with Next's slashless
  production routing.
- Added OG/Twitter metadata and Article/TechArticle + BreadcrumbList schema to
  both supporting pages.
- Generated an EN-only three-URL sitemap so unpublished MT locales are not
  advertised.
- Integrated the EN bundle, clean URL rewrites, root sitemap entries,
  llms.txt passages and a validated/rate-limited lead route in Ludvik4.
- Added regression tests for URL routing, market isolation, bundle contents,
  sitemap discovery and form delivery.

### Strategy artifacts

- `marketing/en/search-and-product-strategy.md`
- `marketing/seo/en-audit-2026-08-11.md`
- `marketing/seo/llm-visibility-matrix-en.md`

### Publication and next action

Local verification completed on 2026-08-11: Gridfin lint and 321 tests passed;
the landing built 26 files. Ludvik4 lint and 358 tests passed; EN production
build, 32/32 e2e, RU static export and local HTTP checks passed. The three EN
pages, both sitemaps and llms.txt returned `200`; invalid lead input returned
`400`; the RU export contained no EN bundle.

Production now returns `200` for the three EN pages, terms, both sitemaps and
`llms.txt`; invalid lead input returns `400`. Ludvik4 main CI `31515277373`
passed every job. The live service-files audit and all three indexing
preflights pass with no issues. The user's `gridfin.pen` change remains
unstaged and untouched.

1. Submit the updated `.dev` sitemap in the existing Search Console property
   and request indexing for the landing.
2. One week after discovery, run the brand-query slice of the LLM visibility
   matrix; expand to category/problem queries in weeks two to four.

---

Last checked: 2026-08-10

## Scope

Public Gridfin landing and supporting pages on `ludvik4.ru`:

- `https://ludvik4.ru/gridfin/`
- `https://ludvik4.ru/gridfin/docs/application-skeleton/`
- `https://ludvik4.ru/gridfin/guides/why-ai-needs-engineering-rules/`

## Current State

The three priority URLs are technically indexable:

- HTTP status: `200`
- `X-Robots-Tag`: none
- HTML meta robots: none
- Canonical: self-referential
- `robots.txt`: reachable
- Root sitemap `https://ludvik4.ru/sitemap.xml`: reachable, `text/xml`
- Gridfin sitemap `https://ludvik4.ru/gridfin/sitemap.xml`: reachable, `text/xml`
- Both sitemaps contain the three priority Gridfin URLs

Public search checks before console submission did not confirm indexing:

- Google `site:ludvik4.ru/gridfin/`: no result shown in the browser SERP snapshot.
- Google exact-title checks for the landing and Application Skeleton page: no result shown in the browser SERP snapshot.
- Yandex `site:ludvik4.ru/gridfin/`: "nothing found" shown in the browser SERP snapshot.
- Yandex exact-title check: exact match was not found; then Yandex started showing CAPTCHA on repeated automated checks.

Authenticated console status:

- Google Search Console domain property `sc-domain:ludvik4.ru` is verified.
- Root sitemap `https://ludvik4.ru/sitemap.xml` is submitted in GSC; status `Successful`, last processed `2026-08-09`, 22 discovered pages at that time.
- Yandex Webmaster property `https://ludvik4.ru` is verified and accessible. Dashboard showed `Ошибок нет`, 18 pages added, 3 pages in search, and 3 recommendations.
- Root sitemap `https://ludvik4.ru/sitemap.xml` is present in Yandex Webmaster both manually and from `robots.txt`; status `ок`, last loaded `2026-07-30 17:11`, 21 links at that time.

## 2026-08-10 Console Actions

Google Search Console / DNS:

- Added Reg.ru DNS record:
  - type: `TXT`
  - host/name: `@`
  - value: `google-site-verification=G5O_0s3CKx2RtlIVLJdoOUr-4UbeLCaWJj66HcQmrlQ`
- Public DNS returned the TXT value from `ns1.reg.ru`, `ns2.reg.ru`, and the default resolver.
- Google Search Console verification succeeded: `Право собственности подтверждено`, method `Провайдер доменных имен`.
- GSC URL Inspection initially reported all three priority URLs as `URL нет в индексе Google`, reason `URL неизвестен Google`.
- Requested indexing for all three priority URLs; GSC accepted each request into the priority crawl queue.

Yandex Webmaster:

- Sent `https://ludvik4.ru/sitemap.xml` for sitemap recrawl; Yandex recrawl quota changed from 10 to 9, confirming the action was accepted.
- Submitted the three priority URLs in `Переобход страниц`.
- Yandex accepted all three; status `В очереди`, submitted `2026-08-10 15:12`.

## 2026-08-10 `/gridfin/sitemap.xml` Fix

Original issue:

- `https://ludvik4.ru/gridfin/sitemap.xml` returned HTML via the app fallback instead of XML.

Local source fix in `liftkit`:

- Added `renderRuSitemap()` in `landing/scripts/build.ts`.
- The landing build now writes `landing/dist/ru/sitemap.xml`.
- Added tests in `landing/scripts/build.test.ts`.

Production fix in `grooownow/ludvik4`:

- Added `public/gridfin/sitemap.xml`.
- Added a regression test in `src/app/sitemap.test.ts`.
- Production commit pushed: `12c8d53 fix(gridfin): serve sitemap from static bundle`.
- GitHub Actions `Deploy RU` run `31393129517` completed successfully.

Live verification after deploy:

- `https://ludvik4.ru/gridfin/sitemap.xml`: `200`, `content-type: text/xml; charset=utf-8`, 3 Gridfin URLs.
- `https://ludvik4.ru/sitemap.xml`: `200`, `content-type: text/xml; charset=utf-8`, includes the three Gridfin URLs.
- `https://ludvik4.ru/robots.txt`: `200`, allows `/`, declares `https://ludvik4.ru/sitemap.xml`.
- The three priority URLs return `200` as HTML.

## Repeat Audit

`service_files_audit.py https://ludvik4.ru/gridfin/`:

- Verdict: `minor_gaps`.
- Required files pass: `robots.txt` is `200`; root sitemap is `200` and parseable; `llms.txt` is `200`.
- Desirable-only gaps: `humans.txt`, `security.txt`, `ads.txt`, and `app-ads.txt` currently fall through to HTML. These are not blockers for Gridfin indexing.

`indexing_preflight.py`:

- `https://ludvik4.ru/gridfin/`: `pass`
- `https://ludvik4.ru/gridfin/docs/application-skeleton/`: `pass`
- `https://ludvik4.ru/gridfin/guides/why-ai-needs-engineering-rules/`: `pass`

Googlebot-style live checks:

- No `X-Robots-Tag`.
- No `noindex`.
- Self-referential canonical on all three priority URLs.
- All three priority URLs are present in both the root sitemap and the Gridfin sitemap.
- JSON-LD exists on the main Gridfin landing. The two supporting docs/guides currently have no JSON-LD; this is a quality enhancement opportunity, not a technical indexing blocker.

## Next Actions

1. Keep the Google TXT verification record in DNS. Removing it can break GSC ownership.
2. Recheck GSC URL Inspection after Google processes the indexing requests, usually later the same day or the next day.
3. Recheck Yandex Webmaster `Переобход страниц` after the queue is processed. Yandex says updates happen after several index database updates.
4. Re-run public `site:` and exact-title checks after Google and Yandex have had time to process.
5. Optional quality enhancement: add Article/TechArticle or WebPage JSON-LD to the two supporting pages.

Do not change DNS, ownership, removals, billing, users, or permissions without explicit instruction.
