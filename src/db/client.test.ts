import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { users } from "./schema";

describe("database layer", () => {
  const client = new PGlite(); // in-memory
  const db = drizzle(client, { schema: { users } });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
  });

  it("inserts and reads a user", async () => {
    await db.insert(users).values({ email: "test@example.test", name: "Test" });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("test@example.test");
  });

  it("enforces unique email", async () => {
    await expect(
      db.insert(users).values({ email: "test@example.test" }),
    ).rejects.toThrow();
  });
});
