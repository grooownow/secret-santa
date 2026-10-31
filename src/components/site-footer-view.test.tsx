import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooterView } from "./site-footer-view";

const labels = {
  rules: "Правила и данные",
  madeBy: "Сделано",
  threads: "Threads",
};

describe("SiteFooterView", () => {
  it("is one mint block with rules, the language line and the developer line", () => {
    const { container } = render(<SiteFooterView labels={labels} />);
    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("bg-santa-mint");
    expect(screen.getByText("RU · UA · EN · ES · DE")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Правила и данные" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ludvik4.dev" })).toBeTruthy();
  });

  it("puts the organizer line inside the same block when given", () => {
    const { container } = render(
      <SiteFooterView labels={labels} organizer="Организатор игры: Kate" />,
    );
    expect(container.querySelector("footer")?.textContent).toContain(
      "Организатор игры: Kate",
    );
  });
});
