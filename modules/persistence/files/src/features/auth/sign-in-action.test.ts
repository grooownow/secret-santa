import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted is required here (not a plain `const signInMock = vi.fn()`):
// the static `import "./sign-in-action"` below pulls in "@/lib/auth"
// transitively, and ESM evaluates that import's dependency graph before
// this file's own top-level statements run — so an un-hoisted const would
// still be in its TDZ when the vi.mock factory reads it.
const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ signIn: signInMock }));

import { signInFormAction, signInWithPassword } from "./sign-in-action";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("signInWithPassword", () => {
  beforeEach(() => {
    signInMock.mockReset();
    resetRateLimitStoreForTests();
  });

  it("rejects invalid input without calling signIn", async () => {
    const res = await signInWithPassword({
      email: "not-an-email",
      password: "",
    });
    expect(res).toEqual({ ok: false, error: expect.any(String) });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("calls signIn with credentials for valid input", async () => {
    signInMock.mockResolvedValueOnce(undefined);
    // "a@b.co" (not "a@b.c" as in the original brief) — zod's default
    // z.email() pattern requires a >=2-char TLD, so a 1-char TLD fails
    // validation and never reaches signIn, which breaks this "valid input"
    // case's intent.
    const res = await signInWithPassword({ email: "a@b.co", password: "pw" });
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "a@b.co", password: "pw" }),
    );
    expect(res).toEqual({ ok: true });
  });

  it("normalises the email before signIn and the rate-limit bucket", async () => {
    signInMock.mockResolvedValueOnce(undefined);
    await signInWithPassword({ email: "  A@B.CO  ", password: "pw" });
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "a@b.co" }),
    );
  });

  it("rate-limits repeated attempts regardless of email casing", async () => {
    signInMock.mockResolvedValue(undefined);
    let lastError = "";
    for (let i = 0; i < 12; i++) {
      // Varying the case must not hand the attacker a fresh bucket.
      const email = i % 2 === 0 ? "a@b.co" : "A@B.CO";
      const res = await signInWithPassword({ email, password: "pw" });
      if (!res.ok) lastError = res.error;
    }
    expect(lastError).toMatch(/too many/i);
  });

  it("rate-limits repeated attempts for the same email", async () => {
    signInMock.mockResolvedValue(undefined);
    let lastError = "";
    for (let i = 0; i < 12; i++) {
      const res = await signInWithPassword({
        email: "a@b.co",
        password: "pw",
      });
      if (!res.ok) lastError = res.error;
    }
    expect(lastError).toMatch(/too many/i);
  });
});

describe("signInFormAction (useActionState shape)", () => {
  beforeEach(() => {
    signInMock.mockReset();
    resetRateLimitStoreForTests();
  });

  it("returns an error and echoes the email back on a bad credential", async () => {
    signInMock.mockRejectedValueOnce(new Error("CredentialsSignin"));
    const state = await signInFormAction(
      {},
      formData({ email: "a@b.co", password: "wrong" }),
    );
    expect(state.error).toMatch(/invalid/i);
    expect(state.email).toBe("a@b.co");
  });

  it("does not call signIn on invalid input, and echoes the raw email", async () => {
    const state = await signInFormAction(
      {},
      formData({ email: "not-an-email", password: "" }),
    );
    expect(state.error).toEqual(expect.any(String));
    expect(state.email).toBe("not-an-email");
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rethrows the NEXT_REDIRECT success signal so navigation happens", async () => {
    const redirect = Object.assign(new Error("redirect"), {
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });
    signInMock.mockRejectedValueOnce(redirect);
    await expect(
      signInFormAction({}, formData({ email: "a@b.co", password: "pw" })),
    ).rejects.toBe(redirect);
  });
});
