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
vi.mock("@/features/profile/photo-input", () => ({
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

  async function closesWith(name: string) {
    render(
      <PostForm authorName="Anna">
        <p>feed</p>
      </PostForm>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Add a post/ }));
    await userEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByText("feed")).toBeTruthy();
  }

  it("closes with the back link", async () => {
    await closesWith(messages.wall.add.back);
  });

  it("closes with cancel", async () => {
    await closesWith(messages.wall.add.cancel);
  });
});
