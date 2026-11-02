import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftForm } from "./gift-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
// The real action is a server action; this one records what was sent.
const submitted: FormData[] = [];
vi.mock("./mark-gift-action", () => ({
  markGiftFormAction: async (_prev: unknown, data: FormData) => {
    submitted.push(data);
    return { saved: true };
  },
}));

// jsdom has no modal dialogs; model what showModal/close toggle.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  submitted.length = 0;
});

async function fillAndSubmit() {
  render(<GiftForm participantId="p1" name="Rob" />);
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(
    screen.getByRole("option", { name: "gift.form.locker" }),
  );
  await userEvent.type(
    screen.getByPlaceholderText("gift.form.notePlaceholder"),
    "hello",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "gift.form.submit" }),
  );
  return document.querySelector("dialog")!;
}

describe("GiftForm", () => {
  it("has no number/code field: only the place and the note", () => {
    render(<GiftForm participantId="p1" name="Rob" />);
    expect(document.querySelector('[name="code"]')).toBeNull();
    expect(document.querySelector('[name="place"]')).not.toBeNull();
    expect(document.querySelector('[name="note"]')).not.toBeNull();
  });

  it("without a place: shows the field error and does not ask or send", async () => {
    render(<GiftForm participantId="p1" name="Rob" />);
    await userEvent.click(
      screen.getByRole("button", { name: "gift.form.submit" }),
    );
    expect(screen.getByText("gift.form.placeMissing")).toBeTruthy();
    expect(document.querySelector("dialog")!.open).toBe(false);
    expect(submitted).toHaveLength(0);
  });

  it("the place picker is our listbox (opens below, own style), not a native select", () => {
    render(<GiftForm participantId="p1" name="Rob" />);
    expect(document.querySelector("select")).toBeNull();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("asks «Всё верно?» first and sends nothing until confirmed", async () => {
    const dialog = await fillAndSubmit();
    expect(dialog.open).toBe(true);
    expect(within(dialog).getByText("gift.form.confirmText")).toBeTruthy();
    expect(submitted).toHaveLength(0);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "gift.form.confirmYes" }),
    );
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]?.get("place")).toBe("locker");
    expect(submitted[0]?.get("note")).toBe("hello");
    expect(submitted[0]?.has("code")).toBe(false);
  });

  it("«check again» closes the question and keeps the form unsent", async () => {
    const dialog = await fillAndSubmit();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "gift.form.confirmBack" }),
    );
    expect(dialog.open).toBe(false);
    expect(submitted).toHaveLength(0);
  });
});
