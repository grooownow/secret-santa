import { describe, expect, test } from "vitest";
import { todayInMadrid } from "./game-time";

describe("todayInMadrid", () => {
  test("Madrid midnight switches the day before UTC", () => {
    expect(todayInMadrid(new Date("2026-12-24T23:30:00Z"))).toBe("2026-12-25");
  });

  test("stays on the same day before Madrid midnight", () => {
    expect(todayInMadrid(new Date("2026-12-24T22:59:00Z"))).toBe("2026-12-24");
  });

  test("uses summer time (UTC+2) in July", () => {
    expect(todayInMadrid(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-15");
  });
});
