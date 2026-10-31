import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://santa.example" },
}));

import { LOCALES } from "@/i18n/locale";
import { EMAIL_TYPES, renderEmail } from "./templates";

const SIGNATURE_URLS = ["ludvik4.dev", "threads.com/@ludvik.coffee"];

describe("renderEmail", () => {
  it("renders every type in every locale with a subject, text and cabinet link", () => {
    for (const locale of LOCALES) {
      for (const type of EMAIL_TYPES) {
        const out = renderEmail(type, locale, {
          names: ["Ana"],
          url: "https://santa.example/x",
        });
        expect(out.subject, `${type}/${locale}`).toBeTruthy();
        expect(out.subject).not.toMatch(/emails\./);
        expect(out.text).toContain("https://santa.example/x");
        expect(out.html).toContain("https://santa.example/x");
      }
    }
  });

  it("uses the requested language", () => {
    expect(renderEmail("draw", "ru", {}).subject).toBe("Жеребьёвка прошла");
    expect(renderEmail("draw", "de", {}).subject).toBe(
      "Die Auslosung ist erfolgt",
    );
  });

  it("draw and reveal emails never contain recipient or santa names", () => {
    // Every EmailData field gets a distinct marker; only the account's own
    // participant name may appear, and only draw/reveal drop the gift fields.
    const data = {
      names: ["OwnChildMarker"],
      url: "https://santa.example/home",
      place: "locker" as const,
      code: "CodeMarker77",
      note: "NoteMarker88",
      noReceiver: true,
    };
    for (const type of ["draw", "reveal"] as const) {
      for (const locale of LOCALES) {
        const out = renderEmail(type, locale, data);
        const all = out.subject + out.text + out.html;
        expect(all).not.toMatch(/CodeMarker77|NoteMarker88/);
        expect(out.text.match(/OwnChildMarker/g)).toHaveLength(1);
      }
    }
    // Control: the same data does reach a gift-waiting email.
    const waiting = renderEmail("giftWaiting", "en", data);
    expect(waiting.text).toMatch(/CodeMarker77/);
    expect(waiting.text).toMatch(/NoteMarker88/);
  });

  it("only the reveal email has the developer line", () => {
    for (const type of EMAIL_TYPES) {
      const out = renderEmail(type, "ru", { names: ["Ана"] });
      const has = SIGNATURE_URLS.some(
        (u) => out.text.includes(u) || out.html.includes(u),
      );
      expect(has, type).toBe(type === "reveal");
    }
    const reveal = renderEmail("reveal", "ru", {});
    expect(reveal.html).toContain("https://ludvik4.dev");
    expect(reveal.html).toContain("https://www.threads.com/@ludvik.coffee");
    expect(reveal.text).toContain("Сделано");
  });

  it("lists the participants the email concerns", () => {
    const out = renderEmail("draw", "en", { names: ["Ana", "Leo"] });
    expect(out.text).toContain("Ana and Leo");
  });

  it("gift-waiting shows place, code and note, escaping user text in html", () => {
    const out = renderEmail("giftWaiting", "en", {
      names: ["Ana"],
      place: "mailbox",
      code: "B-12",
      note: "<b>hi</b>",
    });
    expect(out.text).toContain("Mailbox");
    expect(out.text).toContain("B-12");
    expect(out.text).toContain("<b>hi</b>");
    expect(out.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
    expect(out.html).not.toContain("<b>hi</b>");
  });

  it("picks the nobody-to-give-to wording for reassigned", () => {
    const changed = renderEmail("reassigned", "en", {});
    const none = renderEmail("reassigned", "en", { noReceiver: true });
    expect(changed.subject).toBe("Your recipient has changed");
    expect(none.subject).toBe("No one left to give to");
  });

  it("names the game dates from the settings, formatted per language", () => {
    const dates = { giftsEndOn: "2027-01-02", revealOn: "2027-01-03" };
    expect(renderEmail("giftsOpen", "ru", { dates }).text).toContain(
      "до конца 2 января",
    );
    expect(renderEmail("reminder", "en", { dates }).text).toContain(
      "by the end of January 2",
    );
    expect(renderEmail("reveal", "es", { dates }).text).toContain(
      "Desde el 3 de enero",
    );
    expect(renderEmail("reveal", "de", { dates }).text).toContain(
      "Seit dem 3. Januar",
    );
    for (const locale of LOCALES) {
      for (const type of ["giftsOpen", "reminder", "reveal"] as const) {
        const text = renderEmail(type, locale, { dates }).text;
        expect(text, `${type}/${locale}`).not.toMatch(
          /\b31\b|\b1 (января|січня|January)/,
        );
        expect(text).not.toMatch(/[{}]/);
      }
    }
    // Without dates the defaults are used.
    expect(renderEmail("giftsOpen", "ru").text).toContain(
      "до конца 31 декабря",
    );
  });

  it("falls back to English for an unknown locale value", () => {
    const out = renderEmail("draw", "xx" as never, {});
    expect(out.subject).toBe("The draw is done");
  });
});
