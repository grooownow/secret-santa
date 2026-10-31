import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_PORT } from "../../config/ports";
import { parseEnv } from "./env";

describe("APP_PORT is the single source of truth", () => {
  it("env.ts default NEXT_PUBLIC_APP_URL uses APP_PORT", () => {
    expect(parseEnv({}).NEXT_PUBLIC_APP_URL).toBe(
      `http://localhost:${APP_PORT}`,
    );
  });

  it(".env.example documents APP_PORT and not the old 3000", () => {
    const text = readFileSync(".env.example", "utf8");
    expect(text).toContain(`http://localhost:${APP_PORT}`);
    expect(text).not.toContain("http://localhost:3000");
  });

  it("lighthouserc.js targets APP_PORT and not the old 3000", () => {
    const text = readFileSync("lighthouserc.js", "utf8");
    expect(text).toContain(`localhost:${APP_PORT}`);
    expect(text).not.toContain("localhost:3000");
  });
});
