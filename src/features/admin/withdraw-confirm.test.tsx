import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { WithdrawConfirm } from "./withdraw-confirm";

function lookup(path: string[]): string {
  let node: unknown = messages;
  for (const key of path) node = (node as Record<string, unknown>)[key];
  return String(node);
}

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) =>
    lookup([...ns.split("."), key]),
}));
const actions = vi.hoisted(() => ({
  withdrawAction: vi.fn(),
  retryNotify: vi.fn(),
}));
vi.mock("./withdraw-action", () => actions);

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  actions.withdrawAction.mockReset();
  actions.retryNotify.mockReset();
});

describe("WithdrawConfirm", () => {
  it("shows the unsent-mail warning, retry and Telegram hint after a withdrawal", async () => {
    actions.withdrawAction.mockResolvedValue({
      ok: true,
      removed: 1,
      unnotified: 1,
      retryToken: "opaque",
    });
    render(<WithdrawConfirm id={ID} lastExit="24 December" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );

    expect(await screen.findByText("An email did not go out")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send again" })).toBeTruthy();
    const telegram = screen.getByRole("link", { name: "Write on Telegram" });
    expect(telegram.getAttribute("href")).toBe("https://t.me/ludvik4");
    expect(telegram.getAttribute("target")).toBe("_blank");
  });

  it("retry confirms when everything went out", async () => {
    actions.withdrawAction.mockResolvedValue({
      ok: true,
      removed: 1,
      unnotified: 1,
      retryToken: "opaque",
    });
    actions.retryNotify.mockResolvedValue({
      ok: true,
      left: 0,
      retryToken: null,
    });
    render(<WithdrawConfirm id={ID} lastExit="24 December" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Send again" }),
    );
    expect(await screen.findByText("All emails sent.")).toBeTruthy();
  });

  it("a failed retry is an error, never 'all sent'", async () => {
    actions.withdrawAction.mockResolvedValue({
      ok: true,
      removed: 1,
      unnotified: 1,
      retryToken: "opaque",
    });
    actions.retryNotify.mockResolvedValue({ ok: false });
    render(<WithdrawConfirm id={ID} lastExit="24 December" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Send again" }),
    );
    expect(await screen.findByText(/Could not send/)).toBeTruthy();
    expect(screen.queryByText("All emails sent.")).toBeNull();
  });

  it("a real server error is a generic failure, not 'closed'", async () => {
    actions.withdrawAction.mockRejectedValue(new Error("boom"));
    render(<WithdrawConfirm id={ID} lastExit="24 December" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );
    expect(await screen.findByText(/Something went wrong/)).toBeTruthy();
    expect(screen.queryByText(/no longer available/)).toBeNull();
  });
});
