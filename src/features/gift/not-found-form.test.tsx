import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotFoundForm } from "./not-found-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
const action = vi.hoisted(() => vi.fn());
vi.mock("./not-found-action", () => ({ reportNotFoundFormAction: action }));

describe("NotFoundForm", () => {
  it("confirms visibly once the report is saved", async () => {
    action.mockResolvedValue({ saved: true });
    render(<NotFoundForm participantId="p1" />);
    expect(screen.queryByText("gift.mine.notFound.title")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "gift.mine.notFoundButton" }),
    );
    expect(await screen.findByText("gift.mine.notFound.title")).toBeTruthy();
  });
});
