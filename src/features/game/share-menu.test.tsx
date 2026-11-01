import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareMenu } from "./share-menu";

const labels = {
  button: "Share the game",
  title: "Invite your neighbours",
  qrAlt: "QR code with the link to the game",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Could not copy, select the link by hand",
};

function renderMenu() {
  render(
    <div>
      <ShareMenu
        url="https://santa.example/"
        qr="data:image/png;base64,AAAA"
        labels={labels}
      />
      <button type="button">outside</button>
    </div>,
  );
  return screen.getByRole("button", { name: "Share the game" });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ShareMenu", () => {
  it("opens with the QR and the address; Esc closes and returns focus", async () => {
    const trigger = renderMenu();
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: labels.title });
    expect(
      screen.getByRole("img", { name: labels.qrAlt }).getAttribute("src"),
    ).toBe("data:image/png;base64,AAAA");
    expect(dialog).toHaveTextContent("https://santa.example/");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("a click outside closes it", async () => {
    const trigger = renderMenu();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("copies the address and says so for about two seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const trigger = renderMenu();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(await navigator.clipboard.readText()).toBe("https://santa.example/");
    const status = screen.getByText("Copied");
    expect(status).toHaveAttribute("aria-live", "polite");

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.queryByText("Copied")).toBeNull();
  });

  it("a refused clipboard says so in the same live region", async () => {
    const user = userEvent.setup();
    const trigger = renderMenu();
    await user.click(trigger);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));

    const status = await screen.findByText(labels.copyFailed);
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByText("Copied")).toBeNull();
  });
});
