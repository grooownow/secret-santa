import { describe, expect, it, vi } from "vitest";

describe("getDb laziness", () => {
  it("does not construct a database on import, only on first call, memoized", async () => {
    vi.resetModules();
    const ctor = vi.fn(function PGliteMock() {
      return {} as never;
    });
    vi.doMock("@electric-sql/pglite", () => ({ PGlite: ctor }));
    vi.doMock("drizzle-orm/pglite", () => ({
      drizzle: vi.fn(() => ({ mocked: true })),
    }));
    // Pin pglite mode: this test asserts laziness via the PGlite constructor,
    // so it must not depend on the outer environment (CI's remote-db job runs
    // the suite with GRIDFIN_DB=remote, where getDb() never touches PGlite).
    vi.doMock("@/lib/env", () => ({
      env: { GRIDFIN_DB: "pglite", PGLITE_DATA_DIR: ".pglite" },
    }));

    const mod = await import("./client");
    expect(ctor).not.toHaveBeenCalled(); // import = no side effects

    const a = mod.getDb();
    expect(ctor).toHaveBeenCalledTimes(1); // first call constructs

    const b = mod.getDb();
    expect(ctor).toHaveBeenCalledTimes(1); // memoized
    expect(b).toBe(a);

    vi.doUnmock("@electric-sql/pglite");
    vi.doUnmock("drizzle-orm/pglite");
    vi.doUnmock("@/lib/env");
    vi.resetModules();
  });
});
