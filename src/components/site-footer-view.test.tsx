import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooterView } from "./site-footer-view";

const labels = {
  rules: "Правила и данные",
  madeBy: "Сделано",
  contact: "Связаться",
  social: "Соцсети",
  threads: "Threads",
  order: "Заказать сайт или приложение",
};

describe("SiteFooterView", () => {
  it("is one mint block with the author block and the rules link, no language line", () => {
    const { container } = render(<SiteFooterView labels={labels} />);
    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("bg-santa-mint");
    expect(footer?.textContent).not.toContain("RU · UA");
    expect(screen.getByText("Сделано — Ludvik4")).toBeTruthy();

    const href = (name: string) =>
      screen.getByRole("link", { name }).getAttribute("href");
    expect(href("t.me/ludvik4")).toBe("https://t.me/ludvik4");
    expect(href("Threads")).toBe("https://www.threads.com/@ludvik.coffee");
    expect(href("ludvik4.dev")).toBe("https://ludvik4.dev/");
    expect(href("Правила и данные")).toBe("/rules");

    for (const name of ["t.me/ludvik4", "Threads", "ludvik4.dev"]) {
      const link = screen.getByRole("link", { name });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
    expect(screen.getByText("Заказать сайт или приложение —")).toBeTruthy();
  });

  it("keeps every line the same size: one text-xs on the block, no per-line sizes", () => {
    const { container } = render(
      <SiteFooterView labels={labels} organizer="Организатор игры: Kate" />,
    );
    const footer = container.querySelector("footer")!;
    expect(footer.className).toContain("text-xs");
    const sized = footer.querySelectorAll(
      "[class*='text-[1'], .text-sm, .text-xs",
    );
    expect(sized).toHaveLength(0);
  });

  it("puts the organizer line first and the rules link last", () => {
    const { container } = render(
      <SiteFooterView labels={labels} organizer="Организатор игры: Kate" />,
    );
    const footer = container.querySelector("footer")!;
    expect(footer.firstElementChild?.textContent).toBe(
      "Организатор игры: Kate",
    );
    expect(footer.lastElementChild?.textContent).toBe("Правила и данные");
  });
});
