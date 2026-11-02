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

describe("remote (Neon) connection", () => {
  it("opens postgres without prepared statements and with a small pool", async () => {
    vi.resetModules();
    const postgresMock = vi.fn(() => ({}) as never);
    vi.doMock("postgres", () => ({ default: postgresMock }));
    vi.doMock("drizzle-orm/postgres-js", () => ({
      drizzle: vi.fn(() => ({ remote: true })),
    }));
    vi.doMock("@/lib/env", () => ({ env: {} }));

    const { createDb } = await import("./client");
    createDb({
      GRIDFIN_DB: "remote",
      DATABASE_URL: "postgresql://u:p@host/db",
    } as never);
    // max > 1: with one socket every query of every concurrent request on a
    // Fluid instance queued behind the others (admin tabs took seconds).
    expect(postgresMock).toHaveBeenCalledWith("postgresql://u:p@host/db", {
      prepare: false,
      max: 5,
    });

    vi.doUnmock("postgres");
    vi.doUnmock("drizzle-orm/postgres-js");
    vi.doUnmock("@/lib/env");
    vi.resetModules();
  });
});
