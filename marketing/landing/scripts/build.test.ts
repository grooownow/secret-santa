import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BASE_URL,
  DOC_PAGES,
  RU_BASE_URL,
  buildSite,
  envUrl,
  escapeHtml,
  formEndpoint,
  jsonLdSafe,
  localeUrl,
  mdInline,
  mdStrip,
  pageUrl,
  renderDocPage,
  renderPage,
  renderRootRedirect,
  renderRuSitemap,
  renderSitemap,
  renderTermsPage,
} from "./build";
import type { LocaleTree } from "./i18n-check";

const contentDir = path.join(__dirname, "..", "content");
const read = (name: string) =>
  JSON.parse(readFileSync(path.join(contentDir, name), "utf8")) as LocaleTree;

describe("mdInline", () => {
  it("renders the markdown subset", () => {
    expect(mdInline("**bold** and `code` and _em_")).toBe(
      "<strong>bold</strong> and <code>code</code> and <em>em</em>",
    );
  });

  it("renders links but leaves [email]-style placeholders alone", () => {
    expect(mdInline("[qa-pilot](https://example.com) · [email]")).toBe(
      '<a href="https://example.com">qa-pilot</a> · [email]',
    );
  });

  it("escapes HTML before formatting", () => {
    expect(mdInline("<script> & `<b>`")).toBe(
      "&lt;script&gt; &amp; <code>&lt;b&gt;</code>",
    );
  });

  it("does not format inside code spans", () => {
    expect(mdInline("`a ** b _c_`")).toBe("<code>a ** b _c_</code>");
  });
});

describe("mdStrip", () => {
  it("strips links, strong, code and em down to plain text", () => {
    expect(
      mdStrip("**bold** `code` _em_ [label](https://example.com/page/)"),
    ).toBe("bold code em label");
  });
});

describe("escapeHtml", () => {
  it("escapes the four HTML metacharacters", () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("localeUrl", () => {
  it("puts ru on its own domain and everything else under BASE_URL", () => {
    expect(localeUrl("ru")).toBe(`${RU_BASE_URL}/`);
    expect(localeUrl("en")).toBe(`${BASE_URL}/en`);
    expect(localeUrl("pt-br")).toBe(`${BASE_URL}/pt-br`);
  });
});

describe("formEndpoint", () => {
  it("keeps RU submissions in the RU backend and EN submissions same-origin", () => {
    expect(formEndpoint("ru")).toContain("functions.yandexcloud.net");
    expect(formEndpoint("en")).toBe("/api/gridfin-lead");
  });
});

describe("envUrl", () => {
  it("accepts only absolute http(s) urls and strips trailing slashes", () => {
    expect(envUrl("https://example.com/x///")).toBe("https://example.com/x");
    expect(envUrl("HTTPS://EXAMPLE.COM/x")).toBe("HTTPS://EXAMPLE.COM/x");
    expect(envUrl("http://example.com")).toBe("http://example.com");
  });

  it("rejects the values Vite/Vitest inject and other junk", () => {
    expect(envUrl("/")).toBeUndefined();
    expect(envUrl("")).toBeUndefined();
    expect(envUrl(undefined)).toBeUndefined();
    expect(envUrl("example.com/x")).toBeUndefined();
    expect(envUrl("ftp://example.com")).toBeUndefined();
  });
});

describe("jsonLdSafe", () => {
  it("escapes < so content can never terminate the script element", () => {
    const out = jsonLdSafe({ a: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({
      a: "</script><script>alert(1)</script>",
    });
  });
});

describe("renderPage on real content", () => {
  const locales = ["en", "ru", "de", "es", "pt-br", "fr", "ja"];
  const en = read("en.json");
  const html = renderPage("en", en, locales);

  it("sets the document language and title", () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(
      "<title>Gridfin — Claude Code Starter with Tests &amp; Quality Gates</title>",
    );
  });

  it("emits canonical plus one hreflang per locale plus x-default", () => {
    expect(html).toContain(`<link rel="canonical" href="${BASE_URL}/en">`);
    const hreflangs = html.match(/rel="alternate" hreflang="/g) ?? [];
    expect(hreflangs).toHaveLength(locales.length + 1); // + x-default
    expect(html).toContain(`hreflang="pt-BR" href="${BASE_URL}/pt-br"`);
  });

  it("x-default matches the EN canonical exactly — no trailing slash", () => {
    // A slashed x-default (${BASE_URL}/en/) 308s through Next's
    // trailingSlash=false before landing, which is a needless hop on the
    // one alternate crawlers treat as the default.
    expect(html).toContain(`hreflang="x-default" href="${BASE_URL}/en">`);
    expect(html).not.toContain(`hreflang="x-default" href="${BASE_URL}/en/"`);
  });

  it("points the ru alternate cross-domain", () => {
    expect(html).toContain(`hreflang="ru" href="${RU_BASE_URL}/"`);
  });

  // The 2026-08-07 decision hid the switcher "until ludvik4.dev locales
  // deploy"; they deployed 2026-08-11, so it returns — as a disclosure
  // dropdown, not the old flat row of links (author's requirement).
  describe("language switcher dropdown", () => {
    it("is a collapsed <details> dropdown, not a flat link row", () => {
      expect(html).toContain('<details class="lang">');
      // Collapsed by default: no `open` attribute on the dropdown.
      expect(html).not.toContain('<details class="lang" open>');
      // The pre-2026-08-07 flat row must not come back alongside it.
      expect(html).not.toContain('<nav class="lang"');
    });

    it("summary shows the current language and a localized label", () => {
      expect(html).toMatch(/<summary[^>]*aria-label="Language"[^>]*>/);
      const de = renderPage("de", read("de.json"), locales);
      expect(de).toMatch(/<summary[^>]*aria-label="Sprache"[^>]*>/);
    });

    it("lists international locales without exposing the RU site on EN", () => {
      // The international site must not visibly connect visitors to the
      // separate RU market. Machine-readable hreflang remains in <head>.
      const switcher = html.match(
        /<details class="lang">[\s\S]*?<\/details>/,
      )?.[0];
      expect(switcher).toBeDefined();
      expect(switcher).not.toContain(`${RU_BASE_URL}/`);
      expect(switcher).not.toContain("Русский");
      for (const locale of locales.filter((l) => l !== "ru")) {
        expect(switcher).toContain(
          `<a href="${BASE_URL}/${locale}" lang="${locale === "pt-br" ? "pt-BR" : locale}" hreflang="`,
        );
        expect(switcher).not.toContain(`href="/${locale}/"`);
      }
      // Endonyms, so a reader who landed on the wrong language can find
      // their own without reading the current one.
      for (const name of ["Deutsch", "Español", "Français", "日本語"]) {
        expect(html).toContain(`>${name}</a>`);
      }
    });

    it("marks exactly the current locale with aria-current", () => {
      // `="true">` is the markup form; the CSS selectors in the inline
      // stylesheet end with `]` and must not inflate the count.
      const marks = html.match(/aria-current="true">/g) ?? [];
      expect(marks).toHaveLength(1);
      expect(html).toMatch(
        new RegExp(
          `<a href="${BASE_URL}/en"[^>]*aria-current="true"[^>]*>English</a>`,
        ),
      );
    });
  });

  it("renders the 14 <section> blocks of the v2 structure + skeleton explainer (pricing+FAQ share one)", () => {
    for (const id of [
      "hero",
      "bridge",
      "problem",
      "how",
      "why",
      "skeleton",
      "box",
      "inside",
      "trust",
      "ticker2",
      "cred",
      "fit",
      "price-faq",
      "final",
    ]) {
      expect(html).toContain(`<section id="${id}">`);
    }
  });

  it("gives pricing and FAQ their own anchors inside one section", () => {
    expect(html).toContain('id="pricing"');
    expect(html).toContain('id="faq"');
  });

  it("resolves every in-page anchor to an existing id (no dead or self-referential links)", () => {
    const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    expect(ids.size).toBe([...html.matchAll(/ id="([^"]+)"/g)].length); // no duplicates
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
      expect(ids.has(anchor)).toBe(true);
    }
    // No single <a> may target its own id (the round-1 price-CTA bug).
    for (const [tag] of html.matchAll(/<a [^>]*href="#[^"]+"[^>]*>/g)) {
      const href = /href="#([^"]+)"/.exec(tag)?.[1];
      const ownId = / id="([^"]+)"/.exec(tag)?.[1];
      expect(ownId === undefined || ownId !== href).toBe(true);
    }
  });

  it("has no email anywhere — Telegram is the only contact channel", () => {
    expect(html).not.toContain("[email]");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("@gmail.com");
    expect(html).toContain('href="https://t.me/ludvik4work"');
  });

  it("ships share-card metadata for OG/Twitter/VK", () => {
    expect(html).toContain(
      `<meta property="og:image" content="${BASE_URL}/assets/og-en.png">`,
    );
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    const ru = renderPage("ru", read("ru.json"), locales);
    expect(ru).toContain(
      `<meta property="og:image" content="${RU_BASE_URL}/assets/og-ru.png">`,
    );
  });

  it("renders all 10 FAQ items and both JSON-LD blocks", () => {
    // Classless <details> (first one open) are the FAQ accordion; the
    // language dropdown is <details class="lang"> and stays out of this count.
    expect(html.match(/<details( open)?>/g)).toHaveLength(10);
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("carries the entity attributes in the SoftwareApplication JSON-LD", () => {
    expect(html).toContain(
      '"applicationSubCategory":"Claude Code starter kit"',
    );
    expect(html).toContain('"featureList":["Application Skeleton"');
    expect(html).toContain(
      '"softwareRequirements":"Claude Code, Git, terminal"',
    );
    expect(html).toContain(`"url":"${BASE_URL}/en"`);
    expect(html).toContain('"inLanguage":"en"');

    const ru = renderPage("ru", read("ru.json"), locales);
    expect(ru).toContain(
      '"applicationSubCategory":"Application Skeleton for Claude Code"',
    );
    expect(ru).not.toContain(
      '"applicationSubCategory":"Claude Code starter kit"',
    );
  });

  it("keeps the RU central entity out of starter positioning", () => {
    const ru = renderPage("ru", read("ru.json"), locales);

    expect(ru).toContain(
      "<title>Gridfin — agent-native скелет SaaS для Claude Code</title>",
    );
    expect(ru).toContain(
      "<h1>Запускайте качественные сайты и приложения с Claude Code.</h1>",
    );
    expect(ru).not.toMatch(/<title>[^<]*(?:starter|стартер)/i);
    expect(ru).not.toMatch(/<h1>[^<]*(?:starter|стартер)/i);
  });

  it("strips markdown from the FAQPage JSON-LD (answers carry internal links)", () => {
    const faqLd =
      /<script type="application\/ld\+json">(\{"@context[^<]*"@type":"FAQPage"[^<]*)<\/script>/.exec(
        html,
      );
    expect(faqLd).not.toBeNull();
    const parsed = JSON.parse(faqLd![1]!) as {
      mainEntity: { acceptedAnswer: { text: string } }[];
    };
    expect(parsed.mainEntity).toHaveLength(10);
    for (const item of parsed.mainEntity) {
      expect(item.acceptedAnswer.text).not.toMatch(/\]\(|\*\*|`/);
    }
  });

  it("links both supporting pages from the footer (ru → ru twin, others → en)", () => {
    expect(html).toContain(
      `<a href="${pageUrl("en", "docs/application-skeleton")}">`,
    );
    expect(html).toContain(
      `<a href="${pageUrl("en", "guides/why-ai-needs-engineering-rules")}">`,
    );
    const ru = renderPage("ru", read("ru.json"), locales);
    expect(ru).toContain(
      `<a href="${pageUrl("ru", "docs/application-skeleton")}">`,
    );
    const ja = renderPage("ja", read("ja.json"), locales);
    expect(ja).toContain(
      `<a href="${pageUrl("en", "docs/application-skeleton")}">`,
    );
  });

  it("renders the skeleton-explainer section with its 4 attribute cards and the docs link", () => {
    expect(html.match(/<article class="skel-card">/g)).toHaveLength(4);
    expect(html).toContain(`href="${BASE_URL}/en/docs/application-skeleton"`);
  });

  it("hardcodes the real product artifacts identically for every locale", () => {
    const ru = renderPage("ru", read("ru.json"), locales);
    for (const artifact of [
      "✓ Application Skeleton generated",
      "## Not in v1",
      "✓ tests — 311 passed (311)",
      "lefthook.yml",
    ]) {
      expect(html).toContain(artifact);
      expect(ru).toContain(artifact);
    }
  });

  it("uses the pt-BR hreflang on the pt-br page itself", () => {
    const pt = renderPage("pt-br", read("pt-br.json"), locales);
    expect(pt).toContain('<html lang="pt-BR">');
  });

  it("canonicalizes the ru page on its own domain with same-host assets", () => {
    const ru = renderPage("ru", read("ru.json"), locales);
    expect(ru).toContain(`<link rel="canonical" href="${RU_BASE_URL}/">`);
    expect(ru).toContain(`${RU_BASE_URL}/assets/hero-terminal.png`);
    // /ru/ does not exist on ludvik4.ru.
    expect(ru).not.toContain(`href="/ru/"`);
    // Head hreflang alternates stay even though the visible switcher is gone.
    expect(ru).toContain(`hreflang="en" href="${BASE_URL}/en"`);
  });

  it("ships the beta-request dialog wired to the CTA buttons", () => {
    expect(html).toContain('<dialog id="request-dialog">');
    expect(html).toContain('name="github" required');
    expect(html).toContain('type="email" name="email" required');
    expect(html.match(/<li role="option"/g)).toHaveLength(4); // custom select
    expect(html).toContain('<input type="hidden" name="usage">');
    expect(html).toContain('name="website"');
    expect(html).toContain('id="custom-wrap" hidden');
    // display:flex on labels must not defeat the hidden attribute.
    expect(html).toContain("#request-form [hidden]{display:none!important}");
    // The dialog scrolls and the opened dropdown auto-scrolls into view.
    expect(html).toContain("overflow-y:auto;overscroll-behavior:contain");
    expect(html).toContain('list.scrollIntoView({ block: "nearest"');
    expect(html).toContain('type="checkbox" name="consent" required');
    expect(html).toContain(`href="${BASE_URL}/en/terms" target="_blank"`);
    expect(html).toContain("dlg.showModal()");
    expect(html).toContain('var endpoint = "/api/gridfin-lead";');
    expect(html).not.toContain("functions.yandexcloud.net");
    expect(html).toContain('website: f.get("website")');
    expect(html).not.toContain("web3forms");
    // The ideas-card button and the nav CTA open the same dialog.
    expect(html).toContain('class="micro-cta js-request"');
    expect(html).toContain('class="nav-cta js-request"');
  });

  it("keeps the nav fixed and offsets anchor scrolling", () => {
    expect(html).toContain("header.nav{position:fixed");
    expect(html).toContain("scroll-padding-top:80px");
  });

  it("links the ru consent to the site-wide terms page at the host root", () => {
    const ru = renderPage("ru", read("ru.json"), locales);
    const origin = new URL(RU_BASE_URL).origin;
    expect(ru).toContain(`href="${origin}/terms/" target="_blank"`);
  });
});

describe("renderRootRedirect / renderSitemap", () => {
  const locales = ["en", "ru"];

  it("redirect page points to the absolute EN url and lists alternates", () => {
    const html = renderRootRedirect(locales);
    expect(html).toContain(`url=${BASE_URL}/en`);
    expect(html).not.toContain('url=/en/"');
    expect(html).toContain('hreflang="x-default"');
  });

  it("sitemap lists own-host locales only, ru stays an alternate", () => {
    const xml = renderSitemap(locales);
    expect(xml).toContain(`<loc>${BASE_URL}/en</loc>`);
    expect(xml).not.toContain(`<loc>${RU_BASE_URL}/</loc>`);
    expect(xml).toContain(`hreflang="ru" href="${RU_BASE_URL}/"`);
    expect(xml).toContain('hreflang="x-default"');
  });

  it("sitemap lists the supporting pages (EN loc, RU as alternate)", () => {
    const xml = renderSitemap(locales);
    for (const page of DOC_PAGES) {
      expect(xml).toContain(`<loc>${pageUrl("en", page.slug)}</loc>`);
      expect(xml).not.toContain(`<loc>${pageUrl("ru", page.slug)}</loc>`);
      expect(xml).toContain(`hreflang="ru" href="${pageUrl("ru", page.slug)}"`);
    }
  });

  it("puts <loc> first inside every <url> (sitemap schema order)", () => {
    const xml = renderSitemap(locales);
    const blocks = [...xml.matchAll(/<url>\n([\s\S]*?)<\/url>/g)];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect((block[1] ?? "").trimStart().startsWith("<loc>")).toBe(true);
    }
  });

  it("writes a same-host sitemap for the ru deployment bundle", () => {
    const xml = renderRuSitemap();
    expect(xml).toContain(`<loc>${RU_BASE_URL}/</loc>`);
    expect(xml).not.toContain(`<loc>${BASE_URL}/en</loc>`);
    expect(xml).toContain(`hreflang="en" href="${BASE_URL}/en"`);
    for (const page of DOC_PAGES) {
      expect(xml).toContain(`<loc>${pageUrl("ru", page.slug)}</loc>`);
      expect(xml).not.toContain(`<loc>${pageUrl("en", page.slug)}</loc>`);
      expect(xml).toContain(`hreflang="en" href="${pageUrl("en", page.slug)}"`);
    }
  });
});

describe("buildSite", () => {
  it("writes one page per locale plus redirect, sitemap, robots and assets", () => {
    const dist = mkdtempSync(path.join(tmpdir(), "gridfin-dist-"));
    const written = buildSite(contentDir, dist);
    for (const locale of ["en", "ru", "de", "es", "pt-br", "fr", "ja"]) {
      expect(existsSync(path.join(dist, locale, "index.html"))).toBe(true);
    }
    expect(existsSync(path.join(dist, "index.html"))).toBe(true);
    expect(existsSync(path.join(dist, "sitemap.xml"))).toBe(true);
    expect(existsSync(path.join(dist, "en", "sitemap.xml"))).toBe(true);
    expect(existsSync(path.join(dist, "ru", "sitemap.xml"))).toBe(true);
    expect(existsSync(path.join(dist, "robots.txt"))).toBe(true);
    // The shared assets copy plus the self-contained ru copy.
    expect(existsSync(path.join(dist, "assets", "hero-terminal.png"))).toBe(
      true,
    );
    expect(existsSync(path.join(dist, "assets", "trust-box.jpg"))).toBe(true);
    expect(
      existsSync(path.join(dist, "ru", "assets", "hero-terminal.png")),
    ).toBe(true);
    expect(existsSync(path.join(dist, "ru", "assets", "trust-box.jpg"))).toBe(
      true,
    );
    // Terms pages ship with the bundle (ru text + en text).
    expect(existsSync(path.join(dist, "ru", "terms", "index.html"))).toBe(true);
    expect(existsSync(path.join(dist, "en", "terms", "index.html"))).toBe(true);
    const enTerms = readFileSync(
      path.join(dist, "en", "terms", "index.html"),
      "utf8",
    );
    expect(enTerms).toContain("laws of Spain");
    expect(enTerms).toContain("https://ludvik4.dev/privacy");
    expect(enTerms).toContain("Resend");
    expect(enTerms).not.toMatch(/Yandex|Russia|Russian/);
    // Supporting pages (docs + guides), ru + en each.
    for (const page of DOC_PAGES) {
      for (const lang of ["ru", "en"]) {
        expect(existsSync(path.join(dist, lang, page.slug, "index.html"))).toBe(
          true,
        );
      }
    }
    // 7 pages + 8 asset copies (4 shared + 4 ru) + 2 terms + 4 supporting
    // pages + redirect + two sitemaps + robots.
    expect(written.length).toBe(7 + 8 + 2 + 4 + 5);
  });
});

describe("renderDocPage", () => {
  const page = DOC_PAGES[0]!;
  const markdown = "# Title\n\nIntro para.\n\n## Sub\n\n- one\n- two";

  it("renders meta, canonical and the ru↔en hreflang pair", () => {
    const html = renderDocPage("en", page, markdown);
    expect(html).toContain(`<title>${page.meta.en.title}</title>`);
    expect(html).toContain(
      `<link rel="canonical" href="${pageUrl("en", page.slug)}">`,
    );
    expect(html).toContain(`hreflang="ru" href="${pageUrl("ru", page.slug)}"`);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('"@type":"TechArticle"');
    expect(html).toContain('"@type":"BreadcrumbList"');
  });

  it("canonicalizes the ru page cross-domain and links back to the ru landing", () => {
    const html = renderDocPage("ru", page, markdown);
    expect(html).toContain(
      `<link rel="canonical" href="${RU_BASE_URL}/${page.slug}/">`,
    );
    expect(html).toContain(`<a href="${RU_BASE_URL}/">`);
  });
});

describe("renderTermsPage", () => {
  it("renders the markdown subset used by the terms files", () => {
    const html = renderTermsPage(
      "en",
      "# Title\n\nA para.\n\n- one\n- two\n\n## Sub",
    );
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>A para.</p>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<h2>Sub</h2>");
    expect(html).toContain('<html lang="en">');
  });
});
