// PLANTED DEFECT — see tests/fixtures/planted-defects/ground-truth.json (D4).
// Do not "fix" this file. It is the input to the review skill's detection eval.
import { describe, it } from "vitest";

import { safeCallbackUrl } from "./callback-url";

describe("safeCallbackUrl", () => {
  // DEFECT (D4): the test calls the subject and asserts nothing. It passes with
  // the function returning anything at all — including an open-redirect target —
  // and it would still pass if the function were deleted and stubbed out.
  it("rejects an off-site callback url", () => {
    safeCallbackUrl("https://evil.example.com/steal");
  });

  it("keeps a relative callback url", () => {
    safeCallbackUrl("/dashboard");
  });
});
