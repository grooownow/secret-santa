import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, pickLocale } from "./locale";

describe("pickLocale", () => {
  it("prefers a valid cookie over the browser language", () => {
    expect(pickLocale("de", "ru")).toBe("de");
  });

  it("falls back to Accept-Language when there is no cookie", () => {
    expect(pickLocale(undefined, "es-ES,es;q=0.9")).toBe("es");
  });

  it("respects q-weights in Accept-Language", () => {
    expect(pickLocale(undefined, "fr;q=0.9,uk;q=0.8,en;q=0.1")).toBe("uk");
    expect(pickLocale(undefined, "en;q=0.2,de;q=0.9")).toBe("de");
  });

  it("falls back to English for unknown cookie and language", () => {
    expect(pickLocale("xx", "fr")).toBe("en");
    expect(pickLocale(undefined, undefined)).toBe("en");
    expect(pickLocale(null, "")).toBe("en");
  });

  it("ignores an invalid cookie but still reads the browser language", () => {
    expect(pickLocale("xx", "ru-RU,ru;q=0.9")).toBe("ru");
  });
});

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : flatten(value, `${prefix}${key}.`),
  );
}

function load(locale: string): Tree {
  const file = path.resolve(__dirname, "../../messages", `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Tree;
}

describe("messages files", () => {
  const reference = flatten(load("ru")).sort();

  it("has the same set of keys in all five locales", () => {
    expect(LOCALES).toEqual(["ru", "uk", "en", "es", "de"]);
    for (const locale of LOCALES) {
      expect(flatten(load(locale)).sort(), locale).toEqual(reference);
    }
  });

  it("has no Cyrillic text in en, es and de", () => {
    for (const locale of ["en", "es", "de"]) {
      expect(JSON.stringify(load(locale)), locale).not.toMatch(/[А-Яа-яЁё]/);
    }
  });

  it("has no empty strings", () => {
    for (const locale of LOCALES) {
      expect(JSON.stringify(load(locale)), locale).not.toContain('""');
    }
  });
});

describe("message texts", () => {
  // Game dates are editable in /admin/settings, so texts take them from
  // placeholders (`{giftsEnd}`, `{reveal}`, `{lastExit}`…), never literally.
  it("no message hard-codes a December or January day", () => {
    const pattern =
      /\d{1,2}\.?\s*(de\s+)?(декабря|января|грудня|січня|December|January|diciembre|enero|Dezember|Januar)/i;
    for (const locale of LOCALES) {
      const raw = readFileSync(
        path.join(process.cwd(), "messages", `${locale}.json`),
        "utf8",
      );
      const values = raw.match(/"[^"]*"/g) ?? [];
      const offenders = values.filter((v) => pattern.test(v));
      expect(offenders, locale).toEqual([]);
    }
  });

  // Controller ruling: informal «ты» everywhere in ru and uk, mails included
  // (plural «вы» addressing all players, as on /closed, is fine).
  it("ru and uk address the reader informally", () => {
    const formal = {
      ru: /(?<![а-яё])(вас|вам|ваш[а-яё]*|забыли|попробуйте|проверьте|выберите|подтвердите|загляните|отметьте|оставьте)(?![а-яё])/i,
      uk: /(?<![а-яіїєґ’])(вас|вам|ваш[а-яіїєґ]*|забули|спробуйте|перевірте|оберіть|підтвердьте|загляньте|позначте|залиште)(?![а-яіїєґ’])/i,
    };
    for (const locale of ["ru", "uk"] as const) {
      const raw = readFileSync(
        path.join(process.cwd(), "messages", `${locale}.json`),
        "utf8",
      );
      const offenders = (raw.match(/"[^"]*"/g) ?? []).filter((v) =>
        formal[locale].test(v),
      );
      expect(offenders, locale).toEqual([]);
    }
  });

  it("uk uses one apostrophe (’) and no Russian-only letters", () => {
    const raw = readFileSync(
      path.join(process.cwd(), "messages", "uk.json"),
      "utf8",
    );
    const values = (raw.match(/"[^"]*"/g) ?? []).join(" ");
    expect(values).not.toMatch(/[\p{L}]['ʼ][\p{L}]/u);
    expect(values).not.toMatch(/[ыэъё]/i);
  });
});
