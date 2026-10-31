import { describe, expect, it } from "vitest";

import {
  findTraceViolations,
  type FunctionTrace,
} from "./check-function-traces";

const MB = 1024 * 1024;

function fn(route: string, files: Array<[string, number]>): FunctionTrace {
  return { route, files: files.map(([path, size]) => ({ path, size })) };
}

describe("findTraceViolations", () => {
  it("passes a function that ships only node_modules and .next files", () => {
    const lean = fn("app/(site)/home/page", [
      [".next/server/chunks/a.js", 2 * MB],
      ["node_modules/@electric-sql/pglite/dist/pglite.wasm", 19 * MB],
    ]);
    expect(findTraceViolations([lean])).toEqual([]);
  });

  // A non-literal fs path (e.g. the e2e mail outbox) traces the whole repo.
  it("flags any project file a function ships", () => {
    const leaky = fn("app/(site)/register/page", [
      ["docs/roadmap.md", 1000],
      ["secret-santa.pen", 1000],
      ["images/generated.png", 1000],
    ]);
    const violations = findTraceViolations([leaky]);
    expect(violations).toHaveLength(3);
    expect(violations[0]).toContain(
      "app/(site)/register/page: ships project file docs/roadmap.md",
    );
  });

  it("flags a function over the 40 MB budget", () => {
    const fat = fn("app/(site)/admin/page", [
      ["node_modules/big/blob.bin", 41 * MB],
    ]);
    expect(findTraceViolations([fat])).toEqual([
      "app/(site)/admin/page: 41.0 MB exceeds budget of 40 MB",
    ]);
  });
});
