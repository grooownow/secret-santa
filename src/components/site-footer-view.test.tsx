import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooterView } from "./site-footer-view";

const labels = { title: "Автор приложения" };

describe("SiteFooterView", () => {
  it("is only the «author» heading and one row: ludvik4.dev, Telegram, Threads", () => {
    const { container } = render(<SiteFooterView labels={labels} />);
    const footer = container.querySelector("footer")!;
    expect(footer.className).toContain("bg-santa-mint");
    expect(
      screen.getByRole("heading", { name: "Автор приложения" }),
    ).toBeTruthy();

    const links = screen.getAllByRole("link");
    expect(
      links.map((l) => [l.getAttribute("href"), l.textContent || l.ariaLabel]),
    ).toEqual([
      ["https://ludvik4.dev/", "ludvik4.dev"],
      ["https://t.me/ludvik4", "Telegram"],
      ["https://www.threads.com/@ludvik.coffee", "Threads"],
    ]);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
    // Nothing else: no rules link, no "order a site", no organizer line.
    expect(footer.textContent).toBe("Автор приложенияludvik4.dev");
  });

  it("uses the page's body text size and ≥40px tap targets for the icons", () => {
    render(<SiteFooterView labels={labels} />);
    expect(screen.getByRole("link", { name: "ludvik4.dev" }).className).toMatch(
      /\btext-sm\b/,
    );
    for (const name of ["Telegram", "Threads"]) {
      const icon = screen.getByRole("link", { name });
      expect(icon.className).toContain("size-10");
      expect(icon.querySelector("svg")?.getAttribute("class")).toMatch(
        /size-(5|6)/,
      );
    }
  });
});
