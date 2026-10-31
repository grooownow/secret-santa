import { defineConfig } from "drizzle-kit";

const remote = process.env.GRIDFIN_DB === "remote";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  ...(remote
    ? { dbCredentials: { url: process.env.DATABASE_URL ?? "" } }
    : {
        driver: "pglite",
        dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? ".pglite" },
      }),
});
