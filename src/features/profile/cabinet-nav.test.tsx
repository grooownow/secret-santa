import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CabinetNav } from "./cabinet-nav";

const nav = vi.hoisted(() => ({ pathname: "/home" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("CabinetNav", () => {
  beforeEach(() => {
    nav.pathname = "/home";
  });

  it("has five items: home, profile, gift, wall, settings", () => {
    render(<CabinetNav />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["home", "/home"],
      ["profile", "/home/profile"],
      ["gift", "/home/gift"],
      ["wall", "/home/wall"],
      ["settings", "/home/settings"],
    ]);
    // Equal fifths, so the bar fits 360px.
    for (const link of links) expect(link).toHaveClass("flex-1", "min-w-0");
  });

  it("marks «profile» on the profile and participant forms, «home» only on /home", () => {
    for (const [path, active] of [
      ["/home", "home"],
      ["/home/profile", "profile"],
      ["/home/participants/new", "profile"],
      ["/home/participants/abc", "profile"],
      ["/home/recipient/abc", "gift"],
    ] as const) {
      nav.pathname = path;
      const { unmount } = render(<CabinetNav />);
      const current = screen
        .getAllByRole("link")
        .filter((l) => l.getAttribute("aria-current") === "page");
      expect(current.map((l) => l.textContent)).toEqual([active]);
      // Clearly visible: a filled green pill, the others stay plain.
      expect(current[0]).toHaveClass("bg-santa-green", "text-santa-white");
      for (const other of screen
        .getAllByRole("link")
        .filter((l) => l !== current[0])) {
        expect(other).not.toHaveClass("bg-santa-green");
      }
      unmount();
    }
  });
});

describe("CabinetNav for the organizer", () => {
  it("adds «Админка» last, and only for the organizer", () => {
    const { unmount } = render(<CabinetNav organizer />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(links.at(-1)?.textContent).toBe("admin");
    expect(links.at(-1)?.getAttribute("href")).toBe("/admin");
    unmount();
    render(<CabinetNav />);
    expect(screen.queryByRole("link", { name: "admin" })).toBeNull();
  });

  it("marks «Админка» inside the admin area", () => {
    nav.pathname = "/admin/participants";
    render(<CabinetNav organizer />);
    const current = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.textContent)).toEqual(["admin"]);
  });
});

describe("CabinetNav labels", () => {
  it("a long single-word label (uk «Налаштування») wraps inside its fifth instead of widening the bar", () => {
    render(<CabinetNav />);
    for (const link of screen.getAllByRole("link")) {
      const label = link.querySelector("[data-nav-label]");
      expect(label).not.toBeNull();
      // Breaks (with a hyphen where the browser can) at any point if needed.
      expect(label).toHaveClass("wrap-anywhere", "hyphens-auto", "w-full");
      // Readable: never below 10px, and the icon stays.
      expect(link.className).toMatch(/text-\[(1[0-2])px\]|text-xs/);
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });
});
