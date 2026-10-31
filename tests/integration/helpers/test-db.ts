import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

export type TestDb = PgliteDatabase<typeof schema>;

export interface TestDbHandle {
  db: TestDb;
  /** Closes the underlying PGlite instance. Call in `afterAll`. */
  cleanup: () => Promise<void>;
}

/**
 * Spins up a fresh in-memory PGlite instance with all migrations applied.
 * Call once per test file (e.g. in `beforeAll`) so each file gets an
 * isolated database — this is why the "integration" vitest project runs on a
 * single thread (see vitest.config.ts): PGlite instances are cheap but don't
 * love concurrent access, and there's no state to share across files anyway.
 *
 * Wiring it into code under test: application code reaches the db via
 * `getDb()` from "@/db/client", so tests mock that module to hand back the
 * handle from this helper. `vi.mock` factories are hoisted above imports and
 * run lazily (only when "@/db/client" is actually resolved), so the standard
 * shape is a module-scoped `let` populated in `beforeAll`, closed over by the
 * mock factory:
 *
 * ```ts
 * import { vi, beforeAll, afterAll } from "vitest";
 * import { createTestDb, type TestDb } from "./helpers/test-db";
 *
 * let db: TestDb;
 * let cleanup: () => Promise<void>;
 *
 * vi.mock("@/db/client", () => ({ getDb: () => db }));
 *
 * beforeAll(async () => {
 *   ({ db, cleanup } = await createTestDb());
 * });
 *
 * afterAll(() => cleanup());
 * ```
 *
 * The `vi.mock` call above only wires the closure — it doesn't need `db` to
 * exist yet, since the factory itself isn't invoked until something actually
 * imports "@/db/client" at runtime (typically via a dynamic
 * `await import(...)` of the module under test inside each `it`, after
 * `beforeAll` has run).
 */
export async function createTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  return {
    db,
    cleanup: () => client.close(),
  };
}
