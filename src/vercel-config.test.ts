import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  const config = JSON.parse(
    readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
  ) as {
    fluid?: boolean;
    regions?: string[];
    crons?: { path: string; schedule: string }[];
    git?: { deploymentEnabled?: Record<string, boolean> };
  };

  // maxDuration = 300 (cron route, admin page) is only valid with Fluid
  // Compute on the Hobby plan.
  it("pins Fluid Compute", () => {
    expect(config.fluid).toBe(true);
  });

  // The Neon database lives in eu-central-1 (Frankfurt). Functions in the
  // default iad1 (US East) paid a transatlantic round trip per query, which
  // made every cabinet/admin navigation take seconds.
  it("runs functions next to the database (Frankfurt)", () => {
    expect(config.regions).toEqual(["fra1"]);
  });

  it("keeps the daily cron", () => {
    expect(config.crons).toEqual([
      { path: "/api/cron/daily", schedule: "0 8 * * *" },
    ]);
  });

  // Preview deployments multiply Functions Storage on the Hobby plan.
  it("deploys only main", () => {
    expect(config.git?.deploymentEnabled).toEqual({ main: true, "**": false });
  });
});
