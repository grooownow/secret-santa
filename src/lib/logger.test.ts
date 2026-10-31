import { describe, expect, it } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("exposes structured levels", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
  it("is bound to the app service name", () => {
    expect(logger.bindings().service).toBe("secret-santa");
  });
});
