import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PendingSpinner } from "./spinner";

describe("PendingSpinner", () => {
  it("turns only on the pressed button of a form with several", async () => {
    let release: () => void = () => {};
    const action = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });
    render(
      <form action={action}>
        <button type="submit" name="locale" value="ru">
          ru <PendingSpinner field="locale" value="ru" />
        </button>
        <button type="submit" name="locale" value="uk">
          uk <PendingSpinner field="locale" value="uk" />
        </button>
      </form>,
    );
    expect(document.querySelector("[data-spinner]")).toBeNull();
    await act(async () => {
      screen.getByRole("button", { name: "uk" }).click();
    });
    const uk = screen.getByRole("button", { name: "uk" });
    const ru = screen.getByRole("button", { name: "ru" });
    expect(uk.querySelector("[data-spinner]")).not.toBeNull();
    expect(ru.querySelector("[data-spinner]")).toBeNull();
    await act(async () => release());
  });
});

describe("button motion (globals.css)", () => {
  const css = readFileSync(
    path.join(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  it("buttons darken on hover and press on click", () => {
    expect(css).toMatch(/:hover\s*\{\s*filter: brightness\(0\.95\)/);
    expect(css).toMatch(/:active\s*\{\s*scale: 0\.97/);
  });
  it("respects reduced motion", () => {
    expect(css).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*transition: none/,
    );
  });
});
