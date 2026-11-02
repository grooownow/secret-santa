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
      ["/home/gift/abc", "gift"],
      // What I receive lives on «Профиль».
      ["/home/my-gift/abc", "profile"],
      ["/home/guess/abc", "profile"],
    ] as const) {
      nav.pathname = path;
      const { unmount } = render(<CabinetNav />);
      const current = screen
        .getAllByRole("link")
        .filter((l) => l.getAttribute("aria-current") === "page");
      expect(current.map((l) => l.textContent)).toEqual([active]);
      // A light green pill behind the icon only; the others stay plain.
      const pill = (l: HTMLElement) => l.querySelector("[data-nav-icon]");
      expect(pill(current[0]!)).toHaveClass("bg-santa-mint");
      expect(current[0]).not.toHaveClass("bg-santa-green");
      expect(current[0]).toHaveClass("text-santa-green");
      for (const other of screen
        .getAllByRole("link")
        .filter((l) => l !== current[0])) {
        expect(pill(other)).not.toHaveClass("bg-santa-mint");
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

describe("CabinetNav placement", () => {
  it("the bottom bar stops at desktop, the header menu starts there", () => {
    const { unmount } = render(<CabinetNav />);
    expect(screen.getByRole("navigation")).toHaveClass("lg:hidden");
    unmount();
    render(<CabinetNav variant="header" />);
    expect(screen.getByRole("navigation")).toHaveClass("hidden", "lg:block");
  });

  it("the header menu has the same items and marks the active one", () => {
    nav.pathname = "/home/wall";
    render(<CabinetNav variant="header" organizer />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "home",
      "profile",
      "gift",
      "wall",
      "settings",
      "admin",
    ]);
    expect(
      links
        .filter((l) => l.getAttribute("aria-current") === "page")
        .map((l) => l.textContent),
    ).toEqual(["wall"]);
  });

  it("the active item is bold text and a bold icon, with no underline", () => {
    nav.pathname = "/home/wall";
    render(<CabinetNav variant="header" />);
    const active = screen.getByRole("link", { name: "wall" });
    const other = screen.getByRole("link", { name: "home" });
    expect(active).toHaveClass("font-bold");
    expect(active.className).not.toMatch(/border/);
    expect(active.querySelector("svg")).toHaveAttribute("stroke-width", "2.75");
    expect(other.querySelector("svg")).toHaveAttribute("stroke-width", "2");
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
