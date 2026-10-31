import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, type Env } from "@/lib/env";
import * as schema from "./schema";

export function createDb(config: Env) {
  if (config.GRIDFIN_DB === "remote") {
    // Neon's pooled endpoint (PgBouncer, transaction mode) cannot keep
    // prepared statements, and each serverless instance needs only one
    // connection.
    const sql = postgres(config.DATABASE_URL as string, {
      prepare: false,
      max: 1,
    });
    return drizzlePostgres(sql, { schema });
  }
  const client = new PGlite(config.PGLITE_DATA_DIR);
  return drizzlePglite(client, { schema });
}

let instance: ReturnType<typeof createDb> | undefined;

export function getDb(): ReturnType<typeof createDb> {
  instance ??= createDb(env);
  return instance;
}
