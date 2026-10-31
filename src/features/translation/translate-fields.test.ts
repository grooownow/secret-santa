import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeTranslator } from "./fake-translator";
import { createGroqTranslator } from "./groq-translator";

afterEach(() => vi.unstubAllGlobals());

describe("fake translator", () => {
  it("prefixes the text with the target locale and never uses the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = await createFakeTranslator().translate("hi", "ru", [
      "de",
      "en",
    ]);
    expect(out).toEqual({ de: "[de] hi", en: "[en] hi" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("groq translator", () => {
  function answer(content: unknown, ok = true) {
    return vi.fn(async () => ({
      ok,
      status: ok ? 200 : 429,
      json: async () => ({ choices: [{ message: { content } }] }),
    }));
  }

  it("sends only the text in JSON mode with the configured model and parses the answer", async () => {
    const fetchMock = answer(
      JSON.stringify({ de: " Hallo ", en: "Hi", xx: "no" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await createGroqTranslator("key", "some-model").translate(
      "Привет",
      "ru",
      ["de", "en"],
    );
    expect(out).toEqual({ de: "Hallo", en: "Hi" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("some-model");
    expect(body.temperature).toBe(0);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content).toContain("Привет");
  });

  it("throws on an HTTP error or a broken answer", async () => {
    const t = createGroqTranslator("key", "m");
    vi.stubGlobal("fetch", answer("", false));
    await expect(t.translate("a", "ru", ["de"])).rejects.toThrow();
    vi.stubGlobal("fetch", answer("not json"));
    await expect(t.translate("a", "ru", ["de"])).rejects.toThrow();
  });
});
