import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { RunDrawForm } from "./run-draw-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("./run-draw-action", () => ({ runDraw: vi.fn() }));

// jsdom has no modal dialog support; model the open attribute it toggles.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

function openConfirm() {
  render(<RunDrawForm ready={4} excluded={0} checkHref="/admin" />);
  fireEvent.click(screen.getByRole("button", { name: "admin.draw.start" }));
  const dialog = document.querySelector("dialog")!;
  expect(dialog.open).toBe(true);
  return dialog;
}

describe("RunDrawForm confirmation modal", () => {
  it("closes with the ✕ button", () => {
    const dialog = openConfirm();
    fireEvent.click(
      screen.getByRole("button", { name: "admin.draw.close", hidden: true }),
    );
    expect(dialog.open).toBe(false);
  });

  it("closes on a click outside the window (the backdrop)", () => {
    const dialog = openConfirm();
    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
  });

  it("stays open on a click inside the window", () => {
    const dialog = openConfirm();
    fireEvent.click(
      screen.getByRole("heading", {
        name: "admin.draw.confirmTitle",
        hidden: true,
      }),
    );
    expect(dialog.open).toBe(true);
  });
});
