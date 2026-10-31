import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GiftForm } from "./gift-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
// The real action is a server action; this one saves whatever was typed.
const submitted: FormData[] = [];
vi.mock("./mark-gift-action", () => ({
  markGiftFormAction: async (_prev: unknown, data: FormData) => {
    submitted.push(data);
    const text = (k: string) => String(data.get(k) ?? "");
    return {
      saved: true,
      values: { place: text("place"), code: text("code"), note: text("note") },
    };
  },
}));

describe("GiftForm", () => {
  it("keeps the saved values, so a second save sends them, not the old ones", async () => {
    render(
      <GiftForm
        participantId="p1"
        name="Rob"
        marked
        defaults={{ place: "locker", code: "1", note: "old" }}
      />,
    );
    const code = screen.getByPlaceholderText(
      "gift.form.codePlaceholder",
    ) as HTMLInputElement;
    const note = screen.getByPlaceholderText(
      "gift.form.notePlaceholder",
    ) as HTMLTextAreaElement;
    await userEvent.clear(code);
    await userEvent.type(code, "77");
    await userEvent.clear(note);
    await userEvent.type(note, "new note");
    await userEvent.click(
      screen.getByRole("button", { name: "gift.form.saveChanges" }),
    );
    await waitFor(() => expect(submitted).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    expect(code.value).toBe("77");
    expect(note.value).toBe("new note");

    await userEvent.click(
      screen.getByRole("button", { name: "gift.form.saveChanges" }),
    );
    await waitFor(() => expect(submitted).toHaveLength(2));
    expect(submitted[1]?.get("code")).toBe("77");
    expect(submitted[1]?.get("note")).toBe("new note");
  });
});
