import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { PostForm } from "./post-form";

function lookup(path: string[]): string {
  let node: unknown = messages;
  for (const key of path) node = (node as Record<string, unknown>)[key];
  return String(node);
}

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: { name: string }) =>
    lookup([...ns.split("."), key]).replace("{name}", values?.name ?? ""),
}));
vi.mock("./add-post-action", () => ({ addPost: vi.fn() }));
vi.mock("@/features/profile", () => ({
  PhotoInput: () => <div data-testid="photo" />,
}));

const sentence = "The post will show the name: Anna.";

describe("PostForm", () => {
  it("shows the name-visible sentence exactly once", async () => {
    render(
      <PostForm authorName="Anna">
        <p>feed</p>
      </PostForm>,
    );
    expect(screen.getByText("feed")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Add a post/ }));
    expect(screen.queryByText("feed")).toBeNull();
    expect(screen.getAllByText(new RegExp(sentence))).toHaveLength(1);
  });

  it("closes with the back link and with cancel", async () => {
    render(
      <PostForm authorName="Anna">
        <p>feed</p>
      </PostForm>,
    );
    for (const name of [messages.wall.add.back, messages.wall.add.cancel]) {
      await userEvent.click(screen.getByRole("button", { name: /Add a post/ }));
      await userEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByText("feed")).toBeTruthy();
    }
  });
});
