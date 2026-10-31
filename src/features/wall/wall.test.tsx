import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { DeletePostButton } from "./delete-post-button";
import { WallClosed } from "./wall-closed";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
  getLocale: async () => "en",
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/account", () => ({
  PageTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  PageText: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock("@/features/game", () => ({
  formatGameDay: (date: string) => date,
}));
const remove = vi.hoisted(() => vi.fn());
vi.mock("./delete-post-action", () => ({ deletePost: remove }));

describe("wall placeholder", () => {
  it("shows the opening placeholder before the wall opens", async () => {
    const out = await html(<WallClosed opensOn="2026-12-25" />);
    expect(out).toContain("wall.closed.title");
    expect(out).toContain("wall.closed.text");
  });
});

describe("delete confirm", () => {
  it("deletes nothing until confirmed", async () => {
    remove.mockResolvedValue({ deleted: true });
    render(<DeletePostButton id="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "action" }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "action" }));
    await userEvent.click(screen.getByRole("button", { name: "confirm" }));
    expect(remove).toHaveBeenCalledWith("p1");
  });
});
