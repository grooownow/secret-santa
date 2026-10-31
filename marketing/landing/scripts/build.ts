/**
 * Static-site generator: content/<locale>.json + one template → dist/<locale>/index.html.
 *
 * Refuses to build red content: i18n:check runs first and any issue aborts
 * the build (the brief's «Красный выход — не собираем»). Also emits the root
 * redirect page (/ → /en), sitemap.xml with hreflang alternates, robots.txt,
 * and copies the two photo assets. No framework — the whole page is a
 * template literal.
 *
 * The template mirrors the approved RU v2 mockup (gridfin.pen «RU v2 —
 * Skeleton», 14 sections) and its design system
 * (marketing/strategy/landing-design-system.md): Oswald/Geist/Inter/Geist Mono,
 * the fixed palette, uppercase headings with line-height 1.1. Product
 * artifacts (terminal output, file trees, PRD headers, gate results) are
 * hardcoded here in English for every locale — they are real repository
 * artifacts, not marketing copy (the honesty rule).
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  runChecks,
  type LocaleTree,
  type Schema,
  collectLeaves,
} from "./i18n-check";

/**
 * Hosting decision 2026-08-06: no subdomain — the landing is a page on the
 * author's site. EN (and MT locales) live under ludvik4.dev/gridfin; the RU
 * version lives cross-domain on ludvik4.ru/gridfin (deployed from dist/ru/,
 * which is self-contained: it carries its own assets/ copy).
 */
/**
 * Env override, guarded: Vite/Vitest injects its own process.env.BASE_URL
 * ("/"), so only an absolute http(s) URL counts as an override.
 */
export const envUrl = (value: string | undefined): string | undefined =>
  value && /^https?:\/\//i.test(value) ? value.replace(/\/+$/, "") : undefined;
export const BASE_URL =
  envUrl(process.env.BASE_URL) ?? "https://ludvik4.dev/gridfin";
export const RU_BASE_URL =
  envUrl(process.env.RU_BASE_URL) ?? "https://ludvik4.ru/gridfin";
/**
 * The only public contact channel (decision 2026-08-07: no email on the site).
 * Also the no-JS fallback target for every CTA button.
 */
export const TELEGRAM_URL = "https://t.me/ludvik4work";
export const CTA_URL = process.env.CTA_URL || TELEGRAM_URL;

/** Directory-name → hreflang code (they differ only for pt-br). */
export const HREFLANG: Record<string, string> = {
  en: "en",
  ru: "ru",
  de: "de",
  es: "es",
  "pt-br": "pt-BR",
  fr: "fr",
  ja: "ja",
};

/** Compact code for the collapsed dropdown summary. */
const LANG_LABEL: Record<string, string> = {
  en: "EN",
  ru: "RU",
  de: "DE",
  es: "ES",
  "pt-br": "PT",
  fr: "FR",
  ja: "JA",
};

/**
 * Endonyms for the language dropdown: a reader who landed on the wrong
 * language must be able to find their own without reading the current one.
 * Generator chrome, not content keys — same honesty rule as the terminal
 * artifacts (see content/schema.json's comment).
 */
const LANG_NAME: Record<string, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  es: "Español",
  "pt-br": "Português (BR)",
  fr: "Français",
  ja: "日本語",
};

/** The dropdown's accessible label, in the page's own language. */
const LANG_SWITCHER_LABEL: Record<string, string> = {
  en: "Language",
  ru: "Язык",
  de: "Sprache",
  es: "Idioma",
  "pt-br": "Idioma",
  fr: "Langue",
  ja: "言語",
};

const EN_FORM_ENDPOINT = process.env.FORM_ENDPOINT || "/api/gridfin-lead";
const RU_FORM_ENDPOINT =
  process.env.RU_FORM_ENDPOINT ||
  "https://functions.yandexcloud.net/d4e4h31fkcaqdrj3356i";

/** Market-isolated form delivery: EN stays on ludvik4.dev; RU keeps its existing backend. */
export function formEndpoint(locale: string): string {
  return locale === "ru" ? RU_FORM_ENDPOINT : EN_FORM_ENDPOINT;
}

/** Canonical absolute URL of a locale's page (RU is cross-domain). */
export function localeUrl(locale: string): string {
  return locale === "ru" ? `${RU_BASE_URL}/` : `${BASE_URL}/${locale}`;
}

/**
 * Language switcher — a collapsed <details> disclosure, not the flat link
 * row the 2026-08-07 decision retired. Pure HTML/CSS (no JS to fail); links
 * are absolute via localeUrl() because RU lives cross-domain and the dev
 * locales are slashless, so root-relative hrefs would 404 on one host or
 * the other. Hidden until 2026-08-11 because it advertised locales that
 * were not deployed; deployed ⇔ advertised is now enforced by the parent
 * repo's sitemap test.
 */
export function langSwitcher(current: string, locales: string[]): string {
  // Keep the international storefront visibly independent from the separate
  // RU market. Search engines still receive the RU alternate in <head>.
  const visibleLocales =
    current === "ru" ? locales : locales.filter((locale) => locale !== "ru");
  const items = visibleLocales
    .map((locale) => {
      const active = locale === current ? ' aria-current="true"' : "";
      return `<li><a href="${localeUrl(locale)}" lang="${HREFLANG[locale]}" hreflang="${HREFLANG[locale]}"${active}>${LANG_NAME[locale] ?? locale}</a></li>`;
    })
    .join("");
  const label = LANG_SWITCHER_LABEL[current] ?? LANG_SWITCHER_LABEL.en!;
  return (
    `<details class="lang">` +
    `<summary aria-label="${label}" title="${label}">${LANG_LABEL[current] ?? current.toUpperCase()}</summary>` +
    `<ul>${items}</ul>` +
    `</details>`
  );
}

/**
 * Terms-of-service page URL. The RU text is a site-wide page at the HOST
 * root (ludvik4.ru/terms/ — decision 2026-08-07; deployed from dist/ru/terms
 * into the parent site's public/terms). EN text serves every other locale
 * from inside the landing bundle.
 */
export function termsUrl(locale: string): string {
  return locale === "ru"
    ? `${new URL(RU_BASE_URL).origin}/terms/`
    : `${BASE_URL}/en/terms`;
}

/**
 * Supporting pages of the semantic content network around the landing
 * (2026-08-09 review): the central-entity page and the problem-aware guide.
 * Published in the two human-source locales only; body markdown lives in
 * content/pages/<file>.<lang>.md, meta is defined here.
 */
export const DOC_PAGES: {
  slug: string;
  file: string;
  meta: Record<"ru" | "en", { title: string; description: string }>;
}[] = [
  {
    slug: "docs/application-skeleton",
    file: "application-skeleton",
    meta: {
      ru: {
        title: "Что такое Application Skeleton в Gridfin",
        description:
          "Application Skeleton — заранее собранная архитектурная основа приложения для Claude Code: стек, правила, тесты, quality gates, skills и playbooks в одном процессе.",
      },
      en: {
        title: "What is an Application Skeleton in Gridfin",
        description:
          "An Application Skeleton is a pre-assembled architectural foundation for building with Claude Code: stack, rules, tests, quality gates, skills and playbooks in one workflow.",
      },
    },
  },
  {
    slug: "guides/why-ai-needs-engineering-rules",
    file: "why-ai-needs-engineering-rules",
    meta: {
      ru: {
        title: "Почему AI-разработке нужны инженерные правила — Gridfin",
        description:
          "Claude Code пишет код быстро, но без правил каждая сессия решает заново. Что ломается без specs и tests, почему rules-файла мало и как hooks и гейты дают правилам зубы.",
      },
      en: {
        title: "Why AI Development Needs Engineering Rules — Gridfin",
        description:
          "Claude Code writes code fast, but without rules every session re-decides everything. What breaks without specs and tests, why a rules file isn't enough, and how hooks and quality gates enforce the process.",
      },
    },
  },
];

/** Absolute URL of a supporting page (RU is cross-domain, like the landing). */
export function pageUrl(lang: "ru" | "en", slug: string): string {
  return lang === "ru" ? `${RU_BASE_URL}/${slug}/` : `${BASE_URL}/en/${slug}`;
}

/**
 * Photo assets copied into dist (source → dist/assets/<name>). Paths are
 * relative to marketing/ — the assets are a sibling of landing/, so the
 * marketing folder stays self-contained and moving it cannot break the build.
 */
const ASSETS: Record<string, string> = {
  "hero-terminal.png": "assets/gridfin-landing-hero-terminal.png",
  "trust-box.jpg": "assets/gridfin-landing-trust-box.jpg",
  "og-ru.png": "assets/og-ru.png",
  "og-en.png": "assets/og-en.png",
};

/** Share card (Open Graph / Twitter / VK): RU text for ru, EN for the rest. */
function ogImageUrl(locale: string): string {
  return assetUrl(locale, locale === "ru" ? "og-ru.png" : "og-en.png");
}

/** Absolute URL of an asset as seen from a locale's page (RU host has its own copy). */
function assetUrl(locale: string, name: string): string {
  return locale === "ru"
    ? `${RU_BASE_URL}/assets/${name}`
    : `${BASE_URL}/assets/${name}`;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Inline-markdown subset used by the copy: `code`, **strong**, _em_,
 * [text](url). Escapes HTML first; code spans are protected from the
 * strong/em/link passes.
 */
export function mdInline(text: string): string {
  const parts = escapeHtml(text).split(/(`[^`]+`)/);
  return parts
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return `<code>${part.slice(1, -1)}</code>`;
      }
      return part
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
        .replace(/_([^_\n]+)_/g, "<em>$1</em>");
    })
    .join("");
}

/**
 * Strip the inline-markdown subset down to plain text — for JSON-LD payloads
 * (FAQ answers may carry internal links that must not leak markdown syntax
 * into structured data).
 */
export function mdStrip(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1");
}

/** One flatten per tree instead of one per key lookup. */
const leavesCache = new WeakMap<LocaleTree, ReturnType<typeof collectLeaves>>();
function leavesOf(tree: LocaleTree) {
  let leaves = leavesCache.get(tree);
  if (!leaves) {
    leaves = collectLeaves(tree);
    leavesCache.set(tree, leaves);
  }
  return leaves;
}

function t(tree: LocaleTree, key: string): string {
  const leaf = leavesOf(tree).get(key);
  if (!leaf) throw new Error(`missing key in content: ${key}`);
  return mdInline(leaf.text);
}

export function splitPriceHeading(locale: string, heading: string): string {
  if (locale !== "en") return heading;
  const separator = " — ";
  const separatorIndex = heading.indexOf(separator);
  if (separatorIndex === -1) return heading;
  const firstLine = heading.slice(0, separatorIndex);
  const secondLine = heading.slice(separatorIndex + separator.length);
  return `<span>${firstLine} —</span><span>${secondLine}</span>`;
}

/** Raw (unrendered) text — for <title>, meta and JSON-LD. */
function raw(tree: LocaleTree, key: string): string {
  const leaf = leavesOf(tree).get(key);
  if (!leaf) throw new Error(`missing key in content: ${key}`);
  return leaf.text;
}

/** JSON-LD payload: escape `<` so content can never terminate the script element. */
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

/* ------------------------------------------------------------------ */
/* Real repository artifacts — identical in every locale (honesty rule). */

const TERMINAL_LINES: { text: string; kind: "cmd" | "muted" | "ok" }[] = [
  { text: "$ /gridfin", kind: "cmd" },
  { text: "Analyzing idea...", kind: "muted" },
  { text: "✓ PRD created", kind: "ok" },
  { text: "✓ Specification created", kind: "ok" },
  { text: "✓ Architecture selected", kind: "ok" },
  { text: "✓ Application Skeleton generated", kind: "ok" },
  { text: "Ready to implement.", kind: "muted" },
];

const SKELETON_CHECKLIST = [
  "app/",
  "tests/",
  "playbooks/",
  "hooks/",
  "CLAUDE.md",
  "docs/rules/",
  "quality gates",
  "updates",
];

const ARTIFACT_SPEC_LINES = [
  "docs/prd.md",
  "## Problem",
  "## User",
  "## Features (3-5, v1 only)",
  "## Not in v1",
];

const ARTIFACT_SKELETON_LINES = ["src/", "docs/rules/", "tests/", "CLAUDE.md"];

const ARTIFACT_GATES_LINES = [
  "✓ lint    ✓ secrets",
  "✓ tests — 311 passed (311)",
];

/** Inside-Gridfin window: the real repo tree (indent level, line). */
const INSIDE_TREE: [number, string][] = [
  [0, "gridfin/"],
  [1, "src/"],
  [1, "docs/"],
  [2, "rules/"],
  [2, "playbooks/"],
  [2, "templates/"],
  [1, "tests/"],
  [1, "modules/"],
  [1, "scripts/"],
  [1, ".claude/skills/"],
  [1, "CLAUDE.md"],
  [1, "lefthook.yml"],
];

/** Annotated paths in Inside Gridfin — captions come from content (inside.ann1..4). */
const INSIDE_ANNOTATIONS = ["src/", "docs/playbooks/", "CLAUDE.md", "tests/"];

/* ------------------------------------------------------------------ */

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Inter:wght@400;500;600&family=Geist:wght@400;500&family=Geist+Mono:wght@400;700&display=swap";

/**
 * Design tokens from marketing/strategy/landing-design-system.md. Type scale
 * 13…64, gaps multiple of 4, the fixed palette — values outside the scales
 * are defects.
 */
const CSS = `
:root{
  --surface:#FFFFFF;--surface-peach:#FDE2D9;--surface-cyan:#E0F7FA;
  --fg:#1A1A1A;--fg-secondary:#4B5563;--fg-inverse:#FFFFFF;
  --accent:#7B61FF;--green:#003322;
  --term-bg:#0D1023;--term-bar:#161A30;--term-muted:#AEB6D8;--term-ok:#B8FFDA;
  --on-green:#CFFBE3;--on-violet:#F7F3FF;
  --glass-card:#FFFFFF1F;--glass-badge:#FFFFFF26;--pill-dark:#00000033;
  --overlay:#04100AB3;--badge-violet:#7B61FF1F;
  --font-heading:"Oswald",sans-serif;--font-body:"Geist",system-ui,sans-serif;
  --font-caption:"Inter",system-ui,sans-serif;--font-mono:"Geist Mono",monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:80px}
body{margin:0;font-family:var(--font-body);color:var(--fg);background:var(--surface);line-height:1.4;font-size:16px}
img{max-width:100%;height:auto;display:block}
a{color:inherit}
/* Mockup weights: Oswald has exactly two — 400 (default) and 700 (marked). */
h1,h2,h3{font-family:var(--font-heading);text-transform:uppercase;line-height:1.1;margin:0;font-weight:400}
h1,#how h2,#why h2,#skeleton h2,#inside h2,#trust h2,#final h2{font-weight:700}
p{margin:0}
code{font-family:var(--font-mono);font-size:.92em;background:#0000000f;padding:.05em .3em;border-radius:4px}
.pain code,.pain-solution code,.skeleton-card code,.comp code,.ideas code,.faq-col code,#bridge code,#box code,#cred code,#final code{background:var(--glass-badge)}
.wrap{max-width:1272px;margin:0 auto;padding:0 24px}
@media(min-width:1100px){.wrap{padding:0 84px;max-width:1440px}}
section{padding:48px 0}
@media(min-width:768px){section{padding:72px 0}}

/* ---- nav ---- */
header.nav{position:fixed;top:0;left:0;right:0;z-index:50;background:var(--surface);box-shadow:0 1px 0 #0000001a}
header.nav .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;padding-top:16px;padding-bottom:16px}
main{padding-top:64px}
.brand{font-family:var(--font-heading);font-weight:400;font-size:28px;text-transform:uppercase;text-decoration:none;color:var(--fg)}
nav.links{display:none;gap:32px}
@media(min-width:768px){nav.links{display:flex}}
nav.links a{font-family:var(--font-caption);font-size:14px;text-decoration:none;color:var(--fg-secondary)}
nav.links a:hover{color:var(--fg)}
.nav-cta{font-family:var(--font-caption);font-size:14px;background:var(--accent);color:var(--fg-inverse);border:0;border-radius:4px;padding:10px 16px;cursor:pointer;white-space:nowrap}
.nav-cta:hover{filter:brightness(1.08)}

/* ---- language dropdown ---- */
/* details.lang disclosure in the fixed header: compact code collapsed, the
   endonym list in a right-aligned panel when open. margin-left:auto keeps it
   glued to the CTA side while nav.links is display:none on mobile. NB: this
   comment ships inside the page's inline <style>, so it must never contain
   markup-shaped text — the tests count tags with plain string matches. */
details.lang{position:relative;margin-left:auto}
details.lang summary{list-style:none;cursor:pointer;font-family:var(--font-caption);font-size:14px;color:var(--fg-secondary);border:1px solid #00000026;border-radius:4px;padding:9px 12px;user-select:none;white-space:nowrap}
details.lang summary::-webkit-details-marker{display:none}
details.lang summary::after{content:"▾";margin-left:6px;font-size:10px}
details.lang[open] summary{color:var(--fg)}
details.lang ul{position:absolute;right:0;top:calc(100% + 8px);margin:0;padding:6px;list-style:none;background:var(--surface);border:1px solid #00000026;border-radius:4px;box-shadow:0 8px 24px #00000022;min-width:176px;z-index:60}
details.lang li a{display:block;padding:8px 12px;border-radius:4px;font-family:var(--font-caption);font-size:14px;text-decoration:none;color:var(--fg-secondary);white-space:nowrap}
details.lang li a:hover{background:#00000008;color:var(--fg)}
details.lang li a[aria-current="true"]{color:var(--fg);font-weight:600}
details.lang li a[aria-current="true"]::after{content:"✓";float:right;color:var(--accent)}

/* ---- hero ---- */
/* Mockup YKUmX: white section, dark text column left, photo card 604x633
   right with the terminal overlaid (22px sides, 100px top). */
#hero{padding:24px 0 48px}
@media(min-width:768px){#hero{padding:24px 0 72px}}
.hero-grid{display:grid;gap:48px}
@media(min-width:960px){.hero-grid{grid-template-columns:620fr 604fr;gap:48px;align-items:start}}
.hero-copy{display:flex;flex-direction:column;gap:24px;align-items:flex-start}
.badge{font-family:var(--font-caption);font-size:13px;text-transform:uppercase;background:var(--accent);color:var(--fg-inverse);padding:8px 12px;border-radius:4px}
.hero-copy h1{font-size:34px;color:var(--fg)}
@media(min-width:768px){.hero-copy h1{font-size:56px}}
.hero-sub{font-size:18px;line-height:1.22;color:var(--fg-secondary)}
@media(min-width:768px){.hero-sub{font-size:22px}}
.hero-audience{font-size:16px;color:var(--fg-secondary);line-height:1.35}
.cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.cta{display:inline-block;font-family:var(--font-caption);font-size:16px;font-weight:400;background:var(--accent);color:var(--fg-inverse);text-decoration:none;padding:16px 24px;border-radius:4px;cursor:pointer;border:0}
.cta:hover{filter:brightness(1.08)}
.cta-note{font-family:var(--font-caption);font-size:13px;color:var(--fg-secondary)}
.cta-row .cta-note{max-width:16rem}
.hero-photo{position:relative;border-radius:10px;overflow:hidden;background:#04100A center/cover no-repeat;aspect-ratio:604/633;padding:100px 22px 22px}
.hero-photo::before{content:"";position:absolute;inset:0;background:var(--overlay)}
.hero-photo .terminal{position:relative}
.terminal{background:var(--term-bg);border-radius:10px;box-shadow:0 24px 48px #00000059;overflow:hidden;font-family:var(--font-mono);font-size:15px;line-height:1.2}
@media(min-width:768px){.terminal{font-size:16px}}
.term-bar{display:flex;align-items:center;gap:8px;background:var(--term-bar);padding:12px 16px}
.term-dot{width:12px;height:12px;border-radius:50%}
.term-title{margin-left:8px;font-size:13px;color:var(--term-muted)}
.term-body{padding:24px;display:flex;flex-direction:column;gap:12px}
.term-body .cmd{color:var(--fg-inverse);font-weight:700}
.term-body .muted{color:var(--term-muted)}
.term-body .ok{color:var(--term-ok)}

/* ---- bridge ---- */
#bridge{background:var(--green);padding:48px 0}
#bridge p{color:var(--fg-inverse);font-size:18px;line-height:1.4;max-width:56rem;margin:0 auto;text-align:center}
@media(min-width:768px){#bridge p{font-size:22px}}

/* ---- problem ---- */
#problem{background:var(--accent);padding-bottom:0}
#problem h2{color:var(--fg-inverse);font-size:34px;max-width:64rem}
@media(min-width:768px){#problem h2{font-size:64px}}
.pain-grid{display:grid;gap:16px;margin-top:48px}
@media(min-width:768px){.pain-grid{grid-template-columns:1fr 1fr;gap:24px}}
.pain{background:var(--glass-card);border-radius:6px;padding:24px;color:var(--fg-inverse);display:flex;flex-direction:column;gap:12px}
.pain-num{font-family:var(--font-caption);font-size:13px;background:var(--glass-badge);border-radius:18px;padding:4px 12px;align-self:flex-start}
.pain h3{font-size:24px}
.pain-body{font-size:15px;color:var(--on-violet);line-height:1.25}
.pain-solution{background:var(--pill-dark);border-radius:6px;padding:12px 16px;font-size:14px;line-height:1.3;margin-top:auto}
.ticker{background:var(--green);margin-top:48px}
.ticker .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;padding-top:20px;padding-bottom:20px}
.ticker span{font-family:var(--font-heading);font-weight:400;text-transform:uppercase;font-size:18px;color:var(--fg-inverse);white-space:nowrap}
@media(min-width:768px){.ticker span{font-size:20px}}
.ticker .dot{color:var(--on-green)}

/* ---- how ---- */
.kicker{font-family:var(--font-caption);font-size:13px;text-transform:uppercase;color:var(--accent);font-weight:400}
#how h2{font-size:34px;margin-top:16px;max-width:64rem}
@media(min-width:768px){#how h2{font-size:64px}}
.how-intro{font-size:18px;line-height:1.28;color:var(--fg-secondary);margin-top:16px;max-width:44rem}
.how-grid{display:grid;gap:24px;margin-top:48px}
@media(min-width:960px){.how-grid{grid-template-columns:1.2fr .8fr;align-items:start}}
.steps{display:flex;flex-direction:column;gap:16px}
.step{background:var(--surface-peach);border-radius:6px;padding:24px;display:flex;gap:24px;align-items:flex-start}
.step.accent{background:var(--accent);color:var(--fg-inverse)}
.step.accent .step-body{color:var(--on-violet)}
.step-num{font-family:var(--font-heading);font-weight:400;font-size:34px;line-height:1.1;opacity:.55;min-width:56px}
.step h3{font-size:28px}
.step.accent h3{font-size:34px}
.step-body{font-size:15px;color:var(--fg-secondary);margin-top:8px;line-height:1.3}
.artifacts{display:flex;flex-direction:column;gap:16px;position:sticky;top:24px}
.artifact{border-radius:6px;padding:24px}
.artifact h3{font-size:24px;margin-bottom:16px}
.artifact pre{margin:0;font-family:var(--font-mono);font-size:15px;line-height:1.4;white-space:pre-wrap}
.artifact.cyan{background:var(--surface-cyan)}
.artifact.dark{background:var(--term-bg);color:var(--fg-inverse)}
.artifact.dark pre{color:var(--term-muted)}
.artifact.green{background:var(--green);color:var(--fg-inverse)}
.artifact.green pre{color:var(--term-ok)}

/* ---- why ---- */
#why{background:var(--surface-cyan)}
#why h2{font-size:34px}
@media(min-width:768px){#why h2{font-size:56px}}
.why-grid{display:grid;gap:16px;margin-top:48px}
@media(min-width:768px){.why-grid{grid-template-columns:repeat(2,1fr);gap:24px}}
@media(min-width:1100px){.why-grid{grid-template-columns:repeat(4,1fr)}}
.why-card{background:var(--surface);border-radius:6px;padding:24px;display:flex;flex-direction:column;gap:12px}
.why-num{font-family:var(--font-caption);font-size:13px;color:var(--accent)}
.why-card h3{font-size:24px}
.why-card p{font-size:15px;color:var(--fg-secondary);line-height:1.3}

/* ---- skeleton explainer (central entity) ---- */
#skeleton h2{font-size:34px;margin-top:16px;max-width:64rem}
@media(min-width:768px){#skeleton h2{font-size:56px}}
.skel-body{font-size:18px;line-height:1.3;color:var(--fg-secondary);margin-top:16px;max-width:44rem}
.skel-grid{display:grid;gap:16px;margin-top:48px}
@media(min-width:768px){.skel-grid{grid-template-columns:repeat(2,1fr);gap:24px}}
@media(min-width:1100px){.skel-grid{grid-template-columns:repeat(4,1fr)}}
.skel-card{background:var(--surface-peach);border-radius:6px;padding:24px;display:flex;flex-direction:column;gap:12px}
.skel-card h3{font-size:24px}
.skel-card p{font-size:15px;color:var(--fg-secondary);line-height:1.3}
.skel-link{margin-top:24px;font-family:var(--font-caption);font-size:16px}
.skel-link a{color:var(--accent)}

/* ---- box (what you get) ---- */
#box{background:var(--green);color:var(--fg-inverse)}
#box h2{font-size:34px}
@media(min-width:768px){#box h2{font-size:64px}}
.box-intro{font-size:18px;line-height:1.3;color:var(--on-green);margin-top:16px}
.skeleton-card{background:var(--term-bg);border-radius:10px;padding:24px;margin-top:48px}
@media(min-width:768px){.skeleton-card{padding:40px}}
.skeleton-card h3{font-size:28px}
@media(min-width:768px){.skeleton-card h3{font-size:44px}}
.skeleton-body{font-size:16px;color:var(--on-green);margin-top:12px;line-height:1.3}
.skeleton-list{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.skeleton-list span{font-family:var(--font-mono);font-size:16px;color:var(--term-ok);background:var(--glass-card);border-radius:4px;padding:8px 12px;white-space:nowrap}
.skeleton-divider{height:1px;background:var(--glass-badge);margin:24px 0}
.skeleton-outro{font-size:16px;color:var(--on-green);line-height:1.3}
.comp-grid{display:grid;gap:16px;margin-top:24px}
@media(min-width:768px){.comp-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:1100px){.comp-grid{grid-template-columns:repeat(5,1fr)}}
.comp{background:var(--glass-card);border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:8px}
.comp h3{font-size:20px}
.comp p{font-family:var(--font-body);font-size:14px;color:var(--on-green);line-height:1.3}
.ideas{background:var(--glass-card);border-radius:6px;padding:24px;margin-top:24px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
@media(min-width:960px){.ideas{flex-direction:row;align-items:center;justify-content:space-between;gap:24px}}
.ideas h3{font-size:24px}
.ideas p{font-size:15px;color:var(--on-green);line-height:1.3;max-width:40rem}
.micro-cta{display:inline-block;font-family:var(--font-caption);font-size:15px;background:var(--surface);color:var(--fg);text-decoration:none;padding:12px 20px;border-radius:4px;white-space:nowrap;border:0;cursor:pointer}

/* ---- inside ---- */
#inside{background:var(--surface-peach)}
#inside h2{font-size:34px}
@media(min-width:768px){#inside h2{font-size:56px}}
.inside-intro{font-size:18px;line-height:1.3;color:var(--fg-secondary);margin-top:16px;max-width:44rem}
.inside-grid{display:grid;gap:24px;margin-top:48px}
@media(min-width:960px){.inside-grid{grid-template-columns:1.1fr .9fr;align-items:start}}
.repo-window{background:var(--term-bg);border-radius:10px;overflow:hidden}
.repo-body{padding:24px;font-family:var(--font-mono);font-size:15px;line-height:1.8;color:var(--term-muted)}
.repo-body .root{color:var(--fg-inverse);font-weight:700}
.repo-body .hl{color:var(--term-ok)}
.annotations{display:flex;flex-direction:column;gap:16px}
.annotation{background:var(--surface);border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:4px}
.annotation code{font-family:var(--font-mono);font-size:16px;font-weight:700;background:none;padding:0;color:var(--fg)}
.annotation p{font-size:14px;color:var(--fg-secondary);line-height:1.3}

/* ---- trust ---- */
#trust{background:var(--surface-peach);padding-top:0}
#trust .kicker{display:block}
#trust h2{font-size:28px;margin-top:16px}
@media(min-width:768px){#trust h2{font-size:44px}}
.trust-grid{display:grid;gap:24px;margin-top:48px}
@media(min-width:960px){.trust-grid{grid-template-columns:1fr 1fr;align-items:center}}
.trust-cards{display:flex;flex-direction:column;gap:16px}
.trust-card{background:var(--surface);border-radius:6px;padding:24px;display:flex;flex-direction:column;gap:8px}
.trust-card h3{font-size:22px}
.trust-card p{font-size:15px;color:var(--fg-secondary);line-height:1.3}
.trust-photo{border-radius:10px;overflow:hidden}

/* ---- trust ticker ---- */
#ticker2{background:var(--surface-peach);padding:0 0 48px}
#ticker2 .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center}
#ticker2 span{font-family:var(--font-heading);font-weight:400;text-transform:uppercase;font-size:18px;color:var(--accent);white-space:nowrap}
@media(min-width:768px){#ticker2 span{font-size:22px}}

/* ---- credibility ---- */
#cred{background:var(--accent);padding:48px 0}
#cred .line1{color:var(--fg-inverse);font-size:20px;line-height:1.4}
#cred .line2{color:var(--on-violet);font-size:16px;margin-top:8px}

/* ---- fit ---- */
.fit-grid{display:grid;gap:24px}
@media(min-width:960px){.fit-grid{grid-template-columns:1fr 1fr}}
.fit-card{border-radius:6px;padding:24px}
@media(min-width:768px){.fit-card{padding:40px}}
.fit-card.violet{background:var(--accent);color:var(--fg-inverse)}
.fit-card.cyan{background:var(--surface-cyan)}
.fit-card h2{font-size:28px}
@media(min-width:768px){.fit-card h2{font-size:44px}}
.fit-card ul{margin:24px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px}
.fit-card li{font-size:16px;line-height:1.25;padding-left:28px;position:relative}
@media(min-width:768px){.fit-card li{font-size:18px}}
.fit-card li::before{content:"";position:absolute;left:0;top:.35em;width:12px;height:12px;border-radius:50%}
.fit-card.violet li::before{background:var(--term-ok)}
.fit-card.cyan li::before{background:var(--accent)}
.fit-card.violet li{color:var(--on-violet)}
.fit-card.cyan li{color:var(--fg-secondary)}

/* ---- price + faq ---- */
#price-faq{background:var(--green);color:var(--fg-inverse)}
.price-faq-grid{display:grid;gap:48px}
@media(min-width:960px){.price-faq-grid{grid-template-columns:.9fr 1.1fr;align-items:start}}
.price-card{background:var(--surface);color:var(--fg);border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start;position:sticky;top:24px}
@media(min-width:768px){.price-card{padding:40px}}
.price-card h2{font-size:34px}
.price-card h2 span{display:block}
.price-card h2.price-heading-split{font-size:clamp(28px,4vw,48px)}
.price-card h2.price-heading-split span:first-child{white-space:nowrap}
@media(min-width:768px){.price-card h2{font-size:56px}}
.price-body{font-size:18px;line-height:1.28;color:var(--fg-secondary)}
.price-note{font-family:var(--font-caption);font-size:14px;line-height:1.25;color:var(--fg-secondary)}
.faq-col h2{font-size:34px}
@media(min-width:768px){.faq-col h2{font-size:56px}}
.faq-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.faq-chips span{font-family:var(--font-caption);font-size:14px;background:var(--glass-badge);border-radius:18px;padding:8px 12px}
.faq-col details{background:var(--glass-card);border-radius:6px;margin-top:16px;padding:0}
.faq-col summary{cursor:pointer;font-family:var(--font-heading);font-weight:400;text-transform:uppercase;font-size:18px;line-height:1.1;padding:20px 24px;list-style:none;display:flex;justify-content:space-between;gap:16px;align-items:center}
@media(min-width:768px){.faq-col summary{font-size:22px}}
.faq-col details:first-of-type summary{font-size:22px}
@media(min-width:768px){.faq-col details:first-of-type summary{font-size:24px}}
.faq-col summary::-webkit-details-marker{display:none}
.faq-col summary::after{content:"+";font-family:var(--font-caption);font-size:22px;color:var(--on-green)}
.faq-col details[open] summary::after{content:"−"}
.faq-col details p{padding:0 24px 20px;font-size:15px;line-height:1.25;color:var(--on-green)}
.faq-col details:first-of-type p{font-size:16px}

/* ---- final cta ---- */
#final{background:var(--accent);color:var(--fg-inverse)}
#final .wrap{display:flex;flex-direction:column;gap:24px;align-items:flex-start}
#final h2{font-size:34px;max-width:56rem}
@media(min-width:768px){#final h2{font-size:56px}}
#final .sub{font-size:18px;color:var(--on-violet);max-width:44rem}
#final .cta{background:var(--surface);color:var(--fg)}

/* ---- footer ---- */
footer{background:var(--green);padding:32px 0}
footer .wrap{display:flex;flex-wrap:wrap;gap:16px 24px;justify-content:space-between;font-family:var(--font-caption);font-size:14px;color:var(--on-green)}
footer a{color:var(--term-ok)}
.footer-links{display:flex;flex-wrap:wrap;gap:8px 24px;width:100%}

/* ---- request dialog ---- */
#request-dialog{border:0;border-radius:10px;padding:0;max-width:520px;width:calc(100% - 48px);max-height:calc(100dvh - 48px);overflow-y:auto;overscroll-behavior:contain}
#request-dialog::backdrop{background:#00000066}
#request-form{display:flex;flex-direction:column;gap:20px;padding:32px;font-family:var(--font-caption)}
.form-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.form-head h3{font-size:24px}
.form-close{border:0;background:none;font-size:28px;cursor:pointer;color:var(--fg-secondary);line-height:1;padding:0}
#request-form label{display:flex;flex-direction:column;gap:8px;font-size:14px;font-weight:600;color:var(--fg)}
/* display:flex above would defeat the hidden attribute — the conditional
   «свой вариант» field must actually disappear. */
#request-form [hidden]{display:none!important}
#request-form input:not([type="checkbox"]){font-family:var(--font-body);font-size:15px;font-weight:400;color:var(--fg);padding:0 16px;border:1px solid var(--fg-secondary);border-radius:4px;background:var(--surface);height:48px;width:100%}
#request-form .cta{width:100%;text-align:center;font-size:16px}
.field{display:flex;flex-direction:column;gap:8px}
.field-label{font-size:14px;font-weight:600;color:var(--fg)}
.select{position:relative}
.select-btn{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;height:48px;padding:0 16px;font-family:var(--font-body);font-size:15px;color:var(--fg);background:var(--surface);border:1px solid var(--fg-secondary);border-radius:4px;cursor:pointer;text-align:left}
.select.invalid .select-btn{border-color:var(--accent);box-shadow:0 0 0 2px var(--badge-violet)}
.select-value.placeholder{color:var(--fg-secondary)}
.select-chevron{color:var(--fg-secondary);flex:none;transition:transform .15s}
.select-btn[aria-expanded="true"] .select-chevron{transform:rotate(180deg)}
.select-list{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:10;margin:0;padding:8px;list-style:none;background:var(--surface);border:1px solid var(--fg-secondary);border-radius:6px;box-shadow:0 8px 24px #00000026}
.select-list li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:4px;font-family:var(--font-body);font-size:15px;color:var(--fg);cursor:pointer}
.select-list li:hover{background:var(--surface-cyan)}
.select-list li[aria-selected="true"]{background:var(--surface-cyan)}
.select-list li[aria-selected="true"]::after{content:"✓";color:var(--accent);font-weight:600}
.consent{flex-direction:row!important;align-items:flex-start;gap:12px;font-weight:400!important;cursor:pointer}
.consent input[type="checkbox"]{width:18px;height:18px;margin:1px 0 0;accent-color:var(--accent);flex:none}
.consent span{font-size:13px;line-height:1.4;color:var(--fg-secondary)}
.consent a{color:var(--accent)}
.form-success{font-family:var(--font-body);font-size:15px;line-height:1.4;color:var(--green);background:var(--surface-cyan);border-radius:4px;padding:12px 16px}
`.trim();

/*
 * The visible language switcher is deliberately absent (decision 2026-08-07):
 * the RU page is single-language, and the ludvik4.dev locales are not deployed
 * yet — restore a switcher there once they are. Head hreflang alternates stay.
 */
function hreflangLinks(locales: string[]): string {
  const alternates = locales
    .map(
      (locale) =>
        `<link rel="alternate" hreflang="${HREFLANG[locale]}" href="${localeUrl(locale)}">`,
    )
    .join("\n  ");
  return `${alternates}\n  <link rel="alternate" hreflang="x-default" href="${localeUrl("en")}">`;
}

function jsonLd(locale: string, tree: LocaleTree): string {
  return jsonLdSafe({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Gridfin",
    alternateName: "Gridfin for Claude Code",
    applicationCategory: "DeveloperApplication",
    // Entity attributes for retrieval: category, requirements and the feature
    // list mirror the landing copy (2026-08-09 semantic-SEO review).
    applicationSubCategory:
      locale === "ru"
        ? "Application Skeleton for Claude Code"
        : "Claude Code starter kit",
    operatingSystem: "macOS, Linux, Windows",
    softwareRequirements: "Claude Code, Git, terminal",
    url: localeUrl(locale),
    inLanguage: HREFLANG[locale],
    // Public author identity comes from the footer (ludvik4.*), not invented.
    creator: {
      "@type": "Person",
      name: "Ludvik4",
      url: locale === "ru" ? "https://ludvik4.ru" : "https://ludvik4.dev",
    },
    featureList: [
      "Application Skeleton",
      "Specification-first workflow",
      "Engineering rules",
      "Hooks",
      "Automated tests",
      "Quality gates",
      "Playbooks",
      "Skills",
      "Update workflow",
    ],
    description: raw(tree, "seo.description"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  });
}

/** All FAQ item numbers — single source for the HTML loop and the JSON-LD. */
const FAQ_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** FAQPage JSON-LD — the FAQ items (AEO chunks), markdown stripped. */
function faqJsonLd(tree: LocaleTree): string {
  return jsonLdSafe({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((n) => ({
      "@type": "Question",
      name: mdStrip(raw(tree, `faq.q${n}.q`)),
      acceptedAnswer: {
        "@type": "Answer",
        text: mdStrip(raw(tree, `faq.q${n}.a`)),
      },
    })),
  });
}

export function renderPage(
  locale: string,
  tree: LocaleTree,
  locales: string[],
): string {
  // Supporting pages exist in ru + en only; every other locale links the EN twin.
  const docLang: "ru" | "en" = locale === "ru" ? "ru" : "en";
  const terminal = TERMINAL_LINES.map(
    (line) => `<div class="${line.kind}">${escapeHtml(line.text)}</div>`,
  ).join("\n            ");

  const pains = [1, 2, 3, 4]
    .map(
      (n) => `        <article class="pain">
          <span class="pain-num">0${n}</span>
          <h3>${t(tree, `problem.pain${n}.title`)}</h3>
          <p class="pain-body">${t(tree, `problem.pain${n}.body`)}</p>
          <p class="pain-solution">${t(tree, `problem.pain${n}.solution`)}</p>
        </article>`,
    )
    .join("\n");

  const tickerItems = [1, 2, 3, 4, 5]
    .map((n) => `<span>${t(tree, `problem.ticker${n}`)}</span>`)
    .join('<span class="dot" aria-hidden="true">·</span>');

  const steps = [1, 2, 3, 4, 5, 6]
    .map(
      // Accent = the page's central entity: step 3, Application Skeleton
      // (decision 2026-08-09; was «Спецификация»).
      (n) => `          <article class="step${n === 3 ? " accent" : ""}">
            <span class="step-num">0${n}</span>
            <div>
              <h3>${t(tree, `how.step${n}.title`)}</h3>
              <p class="step-body">${t(tree, `how.step${n}.body`)}</p>
            </div>
          </article>`,
    )
    .join("\n");

  const artifact = (
    cls: string,
    titleKey: string,
    lines: string[],
  ) => `          <aside class="artifact ${cls}">
            <h3>${t(tree, titleKey)}</h3>
            <pre>${lines.map(escapeHtml).join("\n")}</pre>
          </aside>`;

  const whyCards = [1, 2, 3, 4]
    .map(
      (n) => `        <article class="why-card">
          <span class="why-num">0${n}</span>
          <h3>${t(tree, `why.card${n}.title`)}</h3>
          <p>${t(tree, `why.card${n}.body`)}</p>
        </article>`,
    )
    .join("\n");

  const skelCards = [1, 2, 3, 4]
    .map(
      (n) => `        <article class="skel-card">
          <h3>${t(tree, `skeletonExplainer.attr${n}.title`)}</h3>
          <p>${t(tree, `skeletonExplainer.attr${n}.body`)}</p>
        </article>`,
    )
    .join("\n");

  const comps = [1, 2, 3, 4, 5]
    .map(
      (n) => `        <article class="comp">
          <h3>${t(tree, `box.comp${n}.title`)}</h3>
          <p>${t(tree, `box.comp${n}.body`)}</p>
        </article>`,
    )
    .join("\n");

  const highlighted = ["src/", "playbooks/", "CLAUDE.md", "tests/"];
  const repoTree = INSIDE_TREE.map(([level, line]) => {
    const cls =
      level === 0
        ? ' class="root"'
        : highlighted.includes(line)
          ? ' class="hl"'
          : "";
    return `${"  ".repeat(level)}<span${cls}>${escapeHtml(line)}</span>`;
  }).join("\n");

  const annotations = INSIDE_ANNOTATIONS.map(
    (p, i) => `          <div class="annotation">
            <code>${escapeHtml(p)}</code>
            <p>${t(tree, `inside.ann${i + 1}`)}</p>
          </div>`,
  ).join("\n");

  const trustCards = [1, 2, 3]
    .map(
      (n) => `          <article class="trust-card">
            <h3>${t(tree, `trust.card${n}.title`)}</h3>
            <p>${t(tree, `trust.card${n}.body`)}</p>
          </article>`,
    )
    .join("\n");

  const trustTicker = [1, 2, 3, 4]
    .map((n) => `<span>${t(tree, `ticker.t${n}`)}</span>`)
    .join('<span aria-hidden="true">·</span>');

  const chips = [1, 2, 3, 4, 5]
    .map((n) => `<span>${t(tree, `faq.chip${n}`)}</span>`)
    .join("");

  const faq = FAQ_ITEMS.map(
    (n) => `        <details${n === 1 ? " open" : ""}>
          <summary>${t(tree, `faq.q${n}.q`)}</summary>
          <p>${t(tree, `faq.q${n}.a`)}</p>
        </details>`,
  ).join("\n");

  const fitList = (keys: string[]) =>
    keys.map((k) => `            <li>${t(tree, k)}</li>`).join("\n");

  const page = `<!doctype html>
<html lang="${HREFLANG[locale]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(raw(tree, "seo.title"))}</title>
  <meta name="description" content="${escapeHtml(raw(tree, "seo.description"))}">
  <link rel="canonical" href="${localeUrl(locale)}">
  ${hreflangLinks(locales)}
  <meta property="og:title" content="${escapeHtml(raw(tree, "seo.title"))}">
  <meta property="og:description" content="${escapeHtml(raw(tree, "seo.description"))}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${localeUrl(locale)}">
  <meta property="og:image" content="${ogImageUrl(locale)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Gridfin">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(raw(tree, "seo.title"))}">
  <meta name="twitter:description" content="${escapeHtml(raw(tree, "seo.description"))}">
  <meta name="twitter:image" content="${ogImageUrl(locale)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS_HREF}">
  <script type="application/ld+json">${jsonLd(locale, tree)}</script>
  <script type="application/ld+json">${faqJsonLd(tree)}</script>
  <style>${CSS}</style>
</head>
<body>
  <header class="nav">
    <div class="wrap">
      <a class="brand" href="#hero">Gridfin</a>
      <nav class="links" aria-label="Sections">
        <a href="#how">${t(tree, "nav.how")}</a>
        <a href="#box">${t(tree, "nav.box")}</a>
        <a href="#pricing">${t(tree, "nav.price")}</a>
        <a href="#faq">${t(tree, "nav.faq")}</a>
      </nav>
      ${langSwitcher(locale, locales)}
      <button class="nav-cta js-request" type="button">${t(tree, "hero.cta")}</button>
    </div>
  </header>
  <main>
    <section id="hero">
      <div class="wrap">
        <div class="hero-grid">
          <div class="hero-copy">
            <span class="badge">${t(tree, "hero.badge")}</span>
            <h1>${t(tree, "hero.h1")}</h1>
            <p class="hero-sub">${t(tree, "hero.sub")}</p>
            <p class="hero-audience">${t(tree, "hero.audience")}</p>
            <div class="cta-row">
              <a class="cta" href="${escapeHtml(CTA_URL)}">${t(tree, "hero.cta")}</a>
              <p class="cta-note">${t(tree, "hero.ctaNote")}</p>
            </div>
          </div>
          <div class="hero-photo" style="background-image:url('${assetUrl(locale, "hero-terminal.png")}')">
            <div class="terminal" role="img" aria-label="Terminal: /gridfin run">
              <div class="term-bar">
                <span class="term-dot" style="background:#FF5F57"></span>
                <span class="term-dot" style="background:#FEBC2E"></span>
                <span class="term-dot" style="background:#28C840"></span>
                <span class="term-title">${t(tree, "hero.terminalTitle")}</span>
              </div>
              <div class="term-body">
            ${terminal}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="bridge">
      <div class="wrap"><p>${t(tree, "bridge")}</p></div>
    </section>
    <section id="problem">
      <div class="wrap">
        <h2>${t(tree, "problem.h2")}</h2>
        <div class="pain-grid">
${pains}
        </div>
      </div>
      <div class="ticker"><div class="wrap">${tickerItems}</div></div>
    </section>
    <section id="how">
      <div class="wrap">
        <span class="kicker">${t(tree, "how.kicker")}</span>
        <h2>${t(tree, "how.h2")}</h2>
        <p class="how-intro">${t(tree, "how.intro")}</p>
        <div class="how-grid">
          <div class="steps">
${steps}
          </div>
          <div class="artifacts">
${artifact("cyan", "how.artifactSpec", ARTIFACT_SPEC_LINES)}
${artifact("dark", "how.artifactSkeleton", ARTIFACT_SKELETON_LINES)}
${artifact("green", "how.artifactGates", ARTIFACT_GATES_LINES)}
          </div>
        </div>
      </div>
    </section>
    <section id="why">
      <div class="wrap">
        <h2>${t(tree, "why.h2")}</h2>
        <div class="why-grid">
${whyCards}
        </div>
      </div>
    </section>
    <section id="skeleton">
      <div class="wrap">
        <span class="kicker">${t(tree, "skeletonExplainer.kicker")}</span>
        <h2>${t(tree, "skeletonExplainer.h2")}</h2>
        <p class="skel-body">${t(tree, "skeletonExplainer.body")}</p>
        <div class="skel-grid">
${skelCards}
        </div>
        <p class="skel-link">${t(tree, "skeletonExplainer.link")}</p>
      </div>
    </section>
    <section id="box">
      <div class="wrap">
        <h2>${t(tree, "box.h2")}</h2>
        <p class="box-intro">${t(tree, "box.intro")}</p>
        <div class="skeleton-card">
          <h3>${t(tree, "box.skeleton.title")}</h3>
          <p class="skeleton-body">${t(tree, "box.skeleton.body")}</p>
          <div class="skeleton-list">
            ${SKELETON_CHECKLIST.map((item) => `<span>✓ ${escapeHtml(item)}</span>`).join("\n            ")}
          </div>
          <div class="skeleton-divider"></div>
          <p class="skeleton-outro">${t(tree, "box.skeleton.outro")}</p>
        </div>
        <div class="comp-grid">
${comps}
        </div>
        <div class="ideas">
          <div>
            <h3>${t(tree, "box.ideas.title")}</h3>
            <p>${t(tree, "box.ideas.body")}</p>
          </div>
          <button class="micro-cta js-request" type="button">${t(tree, "hero.cta")}</button>
        </div>
      </div>
    </section>
    <section id="inside">
      <div class="wrap">
        <h2>${t(tree, "inside.h2")}</h2>
        <p class="inside-intro">${t(tree, "inside.intro")}</p>
        <div class="inside-grid">
          <div class="repo-window">
            <div class="term-bar">
              <span class="term-dot" style="background:#FF5F57"></span>
              <span class="term-dot" style="background:#FEBC2E"></span>
              <span class="term-dot" style="background:#28C840"></span>
              <span class="term-title">gridfin/</span>
            </div>
            <pre class="repo-body">${repoTree}</pre>
          </div>
          <div class="annotations">
${annotations}
          </div>
        </div>
      </div>
    </section>
    <section id="trust">
      <div class="wrap">
        <span class="kicker">${t(tree, "trust.kicker")}</span>
        <h2>${t(tree, "trust.h2")}</h2>
        <div class="trust-grid">
          <div class="trust-cards">
${trustCards}
          </div>
          <div class="trust-photo">
            <img src="${assetUrl(locale, "trust-box.jpg")}" alt="" loading="lazy" width="1300" height="1210">
          </div>
        </div>
      </div>
    </section>
    <section id="ticker2">
      <div class="wrap">${trustTicker}</div>
    </section>
    <section id="cred">
      <div class="wrap">
        <p class="line1">${t(tree, "cred.line1")}</p>
        <p class="line2">${t(tree, "cred.line2")}</p>
      </div>
    </section>
    <section id="fit">
      <div class="wrap">
        <div class="fit-grid">
          <div class="fit-card violet">
            <h2>${t(tree, "fit.forH2")}</h2>
            <ul>
${fitList(["fit.for1", "fit.for2", "fit.for3"])}
            </ul>
          </div>
          <div class="fit-card cyan">
            <h2>${t(tree, "fit.notH2")}</h2>
            <ul>
${fitList(["fit.not1", "fit.not2", "fit.not3"])}
            </ul>
          </div>
        </div>
      </div>
    </section>
    <section id="price-faq">
      <div class="wrap">
        <div class="price-faq-grid">
          <div id="pricing" class="price-card">
            <span class="kicker">${t(tree, "price.kicker")}</span>
            <h2${locale === "en" ? ' class="price-heading-split"' : ""}>${splitPriceHeading(locale, t(tree, "price.h2"))}</h2>
            <p class="price-body">${t(tree, "price.body")}</p>
            <a class="cta" href="${escapeHtml(CTA_URL)}">${t(tree, "price.cta")}</a>
            <p class="price-note">${t(tree, "price.note")}</p>
          </div>
          <div id="faq" class="faq-col">
            <h2>${t(tree, "faq.h2")}</h2>
            <div class="faq-chips">${chips}</div>
${faq}
          </div>
        </div>
      </div>
    </section>
    <section id="final">
      <div class="wrap">
        <h2>${t(tree, "final.h2")}</h2>
        <p class="sub">${t(tree, "final.sub")}</p>
        <a class="cta" href="${escapeHtml(CTA_URL)}">${t(tree, "final.cta")}</a>
      </div>
    </section>
  </main>
  <footer>
    <div class="wrap">
      <nav class="footer-links" aria-label="Gridfin docs">
        <a href="${pageUrl(docLang, "docs/application-skeleton")}">${t(tree, "footer.skeletonLink")}</a>
        <a href="${pageUrl(docLang, "guides/why-ai-needs-engineering-rules")}">${t(tree, "footer.guideLink")}</a>
      </nav>
      <span>${t(tree, "footer.questions")} <a href="${TELEGRAM_URL}" target="_blank" rel="noopener">Telegram</a></span>
      <span>${t(tree, "footer.author")}</span>
    </div>
  </footer>
  <dialog id="request-dialog">
    <form id="request-form" novalidate>
      <div class="form-head">
        <h3>${t(tree, "form.title")}</h3>
        <button type="button" class="form-close" aria-label="Close">×</button>
      </div>
      <label>${t(tree, "form.github")} *
        <input name="github" required autocomplete="username" placeholder="octocat">
      </label>
      <label>${t(tree, "form.email")} *
        <input type="email" name="email" required autocomplete="email" placeholder="you@example.com">
      </label>
      <label>${t(tree, "form.role")}
        <input name="role">
      </label>
      <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
      <div class="field">
        <span class="field-label" id="usage-label">${t(tree, "form.usage")} *</span>
        <div class="select" id="usage-select">
          <button type="button" class="select-btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="usage-label">
            <span class="select-value placeholder">${t(tree, "form.usagePlaceholder")}</span>
            <svg class="select-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <ul class="select-list" role="listbox" hidden>
            <li role="option" tabindex="-1">${t(tree, "form.usage1")}</li>
            <li role="option" tabindex="-1">${t(tree, "form.usage2")}</li>
            <li role="option" tabindex="-1">${t(tree, "form.usage3")}</li>
            <li role="option" tabindex="-1" data-value="custom">${t(tree, "form.usage4")}</li>
          </ul>
          <input type="hidden" name="usage">
        </div>
      </div>
      <label id="custom-wrap" hidden>${t(tree, "form.usage4")} *
        <input name="custom" placeholder="${escapeHtml(raw(tree, "form.custom"))}">
      </label>
      <label class="consent">
        <input type="checkbox" name="consent" required>
        <span>${t(tree, "form.consent").replace(
          "[terms]",
          `<a href="${termsUrl(locale)}" target="_blank" rel="noopener">${t(tree, "form.consentLink")}</a>`,
        )}</span>
      </label>
      <p class="form-success" hidden>${t(tree, "form.success")}</p>
      <button class="cta" type="submit">${t(tree, "form.submit")}</button>
    </form>
  </dialog>
  <script>
  (function () {
    var dlg = document.getElementById("request-dialog");
    if (!dlg || !dlg.showModal) return;
    var form = document.getElementById("request-form");
    document.querySelectorAll("a.cta, .js-request").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        dlg.showModal();
      });
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
    dlg.querySelector(".form-close").addEventListener("click", function () {
      dlg.close();
    });

    var select = document.getElementById("usage-select");
    var btn = select.querySelector(".select-btn");
    var list = select.querySelector(".select-list");
    var value = select.querySelector(".select-value");
    var hiddenInput = select.querySelector('input[name="usage"]');
    var customWrap = document.getElementById("custom-wrap");
    function closeList() {
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
    btn.addEventListener("click", function () {
      list.hidden = !list.hidden;
      btn.setAttribute("aria-expanded", String(!list.hidden));
      if (!list.hidden) {
        // The dropdown may open past the dialog's visible edge — the dialog
        // scrolls, so bring the whole list into view.
        requestAnimationFrame(function () {
          list.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      }
    });
    document.addEventListener("click", function (e) {
      if (!select.contains(e.target)) closeList();
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !list.hidden) {
        e.preventDefault();
        closeList();
      }
    });
    list.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("click", function () {
        list.querySelectorAll("li").forEach(function (other) {
          other.removeAttribute("aria-selected");
        });
        li.setAttribute("aria-selected", "true");
        value.textContent = li.textContent;
        value.classList.remove("placeholder");
        hiddenInput.value = li.dataset.value || li.textContent;
        select.classList.remove("invalid");
        var custom = li.dataset.value === "custom";
        customWrap.hidden = !custom;
        customWrap.querySelector("input").required = custom;
        closeList();
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!hiddenInput.value) {
        select.classList.add("invalid");
        btn.focus();
        return;
      }
      if (!form.reportValidity()) return;
      var f = new FormData(form);
      var usage = f.get("usage") === "custom" ? f.get("custom") : f.get("usage");
      var payload = {
        github: f.get("github"),
        email: f.get("email"),
        role: f.get("role") || "-",
        usage: usage,
        page: location.href,
        website: f.get("website"),
      };
      var endpoint = "${formEndpoint(locale)}";
      function telegramFallback() {
        location.href = "${TELEGRAM_URL}";
        dlg.close();
      }
      if (!endpoint) return telegramFallback();
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          form.querySelectorAll("label, .field, .cta").forEach(function (el) {
            el.hidden = true;
          });
          form.querySelector(".form-success").hidden = false;
        })
        .catch(telegramFallback);
    });
  })();
  </script>
</body>
</html>
`;
  return page;
}

/**
 * Markdown subset shared by the simple text pages (terms, docs, guides):
 * # / ## headings, paragraphs and dash-lists.
 */
function mdBlocks(markdown: string): string {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## "))
        return `<h2>${mdInline(block.slice(3))}</h2>`;
      if (block.startsWith("# ")) return `<h1>${mdInline(block.slice(2))}</h1>`;
      if (/^- /m.test(block)) {
        const items = block
          .split("\n")
          .map((line) => `<li>${mdInline(line.replace(/^- /, ""))}</li>`)
          .join("\n");
        return `<ul>\n${items}\n</ul>`;
      }
      return `<p>${mdInline(block)}</p>`;
    })
    .join("\n");
}

/** Shared styles of the simple text pages — same tokens as the landing. */
const SIMPLE_PAGE_CSS = `
  *{box-sizing:border-box}
  body{margin:0;font-family:"Geist",system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1A1A1A;background:#FFFFFF}
  main{max-width:44rem;margin:0 auto;padding:48px 24px 72px}
  h1,h2{font-family:"Oswald",sans-serif;text-transform:uppercase;line-height:1.1;font-weight:400}
  h1{font-size:34px;margin:0 0 24px}
  h2{font-size:22px;margin:40px 0 12px}
  p,li{color:#4B5563}
  a{color:#7B61FF}
  .back{font-family:"Inter",system-ui,sans-serif;font-size:14px;margin:0 0 32px}
  .back a{text-decoration:none}`;

/**
 * Terms-of-service page: rendered from landing/content/terms.<lang>.md
 * (headings, paragraphs, dash-lists — the subset those files use). RU ships
 * on the RU host, the EN text serves every other locale.
 */
export function renderTermsPage(lang: "ru" | "en", markdown: string): string {
  const title =
    lang === "ru"
      ? "Пользовательское соглашение — Gridfin"
      : "Terms of Service — Gridfin";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="canonical" href="${termsUrl(lang)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS_HREF}">
  <style>${SIMPLE_PAGE_CSS}
  </style>
</head>
<body>
  <main>
${mdBlocks(markdown)}
  </main>
</body>
</html>
`;
}

/**
 * Supporting page (docs/guides): markdown body + its own canonical, meta
 * description and a ru↔en hreflang pair. A back-link leads to the landing.
 */
export function renderDocPage(
  lang: "ru" | "en",
  page: (typeof DOC_PAGES)[number],
  markdown: string,
): string {
  const { title, description } = page.meta[lang];
  const landing = localeUrl(lang);
  const canonical = pageUrl(lang, page.slug);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": page.slug.startsWith("docs/") ? "TechArticle" : "Article",
        headline: title,
        description,
        url: canonical,
        inLanguage: lang,
        author: {
          "@type": "Person",
          name: "Ludvik4",
          url: "https://ludvik4.dev",
        },
        publisher: {
          "@type": "Person",
          name: "Ludvik4",
          url: "https://ludvik4.dev",
        },
        image: ogImageUrl(lang),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Gridfin", item: landing },
          { "@type": "ListItem", position: 2, name: title, item: canonical },
        ],
      },
    ],
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ru" href="${pageUrl("ru", page.slug)}">
  <link rel="alternate" hreflang="en" href="${pageUrl("en", page.slug)}">
  <link rel="alternate" hreflang="x-default" href="${pageUrl("en", page.slug)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImageUrl(lang)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImageUrl(lang)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS_HREF}">
  <script type="application/ld+json">${jsonLdSafe(schema)}</script>
  <style>${SIMPLE_PAGE_CSS}
  </style>
</head>
<body>
  <main>
    <p class="back"><a href="${landing}">← Gridfin</a></p>
${mdBlocks(markdown)}
  </main>
</body>
</html>
`;
}

export function renderRootRedirect(locales: string[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Gridfin</title>
  <meta http-equiv="refresh" content="0; url=${localeUrl("en")}">
  <link rel="canonical" href="${localeUrl("en")}">
  ${hreflangLinks(locales)}
</head>
<body><p><a href="${localeUrl("en")}">Gridfin — continue to the English page</a></p></body>
</html>
`;
}

export function renderSitemap(locales: string[]): string {
  // Schema order: <loc> must be the first child of <url>.
  const alternateBlock = (own: string) =>
    `    <loc>${localeUrl(own)}</loc>\n` +
    locales
      .map(
        (locale) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG[locale]}" href="${localeUrl(locale)}"/>`,
      )
      .join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl("en")}"/>`;
  // A sitemap may only list URLs on its own host: the RU page lives on
  // ludvik4.ru and is excluded from <loc> entries (it stays in alternates).
  const urls = locales
    .filter((locale) => locale !== "ru")
    .map((locale) => `  <url>\n${alternateBlock(locale)}\n  </url>`)
    .join("\n");
  // Supporting pages (EN <loc> on this host; the RU twin stays an alternate).
  const pageUrls = DOC_PAGES.map(
    (page) =>
      `  <url>\n    <loc>${pageUrl("en", page.slug)}</loc>\n` +
      `    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl("en", page.slug)}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="ru" href="${pageUrl("ru", page.slug)}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("en", page.slug)}"/>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
${pageUrls}
</urlset>
`;
}

export function renderRuSitemap(): string {
  const urls = [
    `  <url>
    <loc>${localeUrl("ru")}</loc>
    <xhtml:link rel="alternate" hreflang="ru" href="${localeUrl("ru")}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${localeUrl("en")}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl("en")}"/>
  </url>`,
    ...DOC_PAGES.map(
      (page) =>
        `  <url>\n    <loc>${pageUrl("ru", page.slug)}</loc>\n` +
        `    <xhtml:link rel="alternate" hreflang="ru" href="${pageUrl("ru", page.slug)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl("en", page.slug)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("en", page.slug)}"/>\n  </url>`,
    ),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function buildSite(contentDir: string, distDir: string): string[] {
  const schema = JSON.parse(
    readFileSync(path.join(contentDir, "schema.json"), "utf8"),
  ) as Schema;
  const glossary = JSON.parse(
    readFileSync(path.join(contentDir, "glossary.json"), "utf8"),
  ) as { terms: string[] };

  const files = new Map<string, LocaleTree>();
  const absent: string[] = [];
  for (const locale of Object.keys(schema.locales)) {
    const filePath = path.join(contentDir, `${locale}.json`);
    if (existsSync(filePath)) {
      files.set(
        locale,
        JSON.parse(readFileSync(filePath, "utf8")) as LocaleTree,
      );
    } else {
      absent.push(locale);
    }
  }
  // A missing locale file silently drops that language from the site — never
  // let that happen without a trace in the build output.
  if (absent.length > 0) {
    console.warn(
      `⚠ locale file(s) missing, building without: ${absent.join(", ")}`,
    );
  }
  if (!process.env.CTA_URL) {
    console.warn(
      "⚠ CTA_URL not set — CTA buttons fall back to the Telegram link",
    );
  }

  const issues = runChecks(schema, glossary.terms, files);
  if (issues.length > 0) {
    throw new Error(
      `i18n:check failed with ${issues.length} issue(s) — not building. Run pnpm i18n:check for the list.`,
    );
  }

  const locales = [...files.keys()];
  rmSync(distDir, { recursive: true, force: true });
  const written: string[] = [];
  for (const locale of locales) {
    const dir = path.join(distDir, locale);
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, "index.html");
    writeFileSync(out, renderPage(locale, files.get(locale)!, locales));
    written.push(out);
  }

  // Photo assets: one shared copy for the ludvik4.dev bundle and one inside
  // dist/ru/ so the cross-domain RU deploy is self-contained. ASSETS paths
  // are relative to marketing/ (contentDir is marketing/landing/content).
  const marketingRoot = path.join(contentDir, "..", "..");
  for (const targetDir of [
    path.join(distDir, "assets"),
    ...(files.has("ru") ? [path.join(distDir, "ru", "assets")] : []),
  ]) {
    mkdirSync(targetDir, { recursive: true });
    for (const [name, source] of Object.entries(ASSETS)) {
      const sourcePath = path.join(marketingRoot, source);
      if (!existsSync(sourcePath)) {
        throw new Error(`asset missing: ${source} — not building`);
      }
      const target = path.join(targetDir, name);
      copyFileSync(sourcePath, target);
      written.push(target);
    }
  }

  // Terms pages: RU text on the RU host bundle, EN text for everyone else.
  for (const lang of ["ru", "en"] as const) {
    if (!files.has(lang)) continue;
    const markdown = readFileSync(
      path.join(contentDir, `terms.${lang}.md`),
      "utf8",
    );
    const dir = path.join(distDir, lang, "terms");
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, "index.html");
    writeFileSync(out, renderTermsPage(lang, markdown));
    written.push(out);
  }

  // Supporting pages (docs/guides) — the SCN around the landing, ru + en.
  for (const page of DOC_PAGES) {
    for (const lang of ["ru", "en"] as const) {
      if (!files.has(lang)) continue;
      const markdown = readFileSync(
        path.join(contentDir, "pages", `${page.file}.${lang}.md`),
        "utf8",
      );
      const dir = path.join(distDir, lang, page.slug);
      mkdirSync(dir, { recursive: true });
      const out = path.join(dir, "index.html");
      writeFileSync(out, renderDocPage(lang, page, markdown));
      written.push(out);
    }
  }

  writeFileSync(path.join(distDir, "index.html"), renderRootRedirect(locales));
  writeFileSync(path.join(distDir, "sitemap.xml"), renderSitemap(locales));
  writeFileSync(
    path.join(distDir, "en", "sitemap.xml"),
    renderSitemap(["en", "ru"]),
  );
  if (files.has("ru")) {
    writeFileSync(path.join(distDir, "ru", "sitemap.xml"), renderRuSitemap());
  }
  writeFileSync(
    path.join(distDir, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`,
  );
  written.push(
    path.join(distDir, "index.html"),
    path.join(distDir, "sitemap.xml"),
    path.join(distDir, "en", "sitemap.xml"),
    ...(files.has("ru") ? [path.join(distDir, "ru", "sitemap.xml")] : []),
    path.join(distDir, "robots.txt"),
  );
  return written;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const written = buildSite(
    path.join(here, "..", "content"),
    path.join(here, "..", "dist"),
  );
  console.log(`✓ built ${written.length} file(s) → landing/dist/`);
}
