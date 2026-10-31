import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  const config = JSON.parse(
    readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
  ) as { fluid?: boolean; crons?: { path: string; schedule: string }[] };

  // maxDuration = 300 (cron route, admin page) is only valid with Fluid
  // Compute on the Hobby plan.
  it("pins Fluid Compute", () => {
    expect(config.fluid).toBe(true);
  });

  it("keeps the daily cron", () => {
    expect(config.crons).toEqual([
      { path: "/api/cron/daily", schedule: "0 8 * * *" },
    ]);
  });
});
