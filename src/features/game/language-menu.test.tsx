import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LanguageMenu } from "./language-menu";

function setup() {
  render(
    <div>
      <button type="button">outside</button>
      <LanguageMenu label="Switch language" current="RU">
        <form onSubmit={(e) => e.preventDefault()}>
          <button type="submit" name="locale" value="en">
            English
          </button>
        </form>
      </LanguageMenu>
    </div>,
  );
  const trigger = screen.getByRole("button", { name: "Switch language" });
  return { trigger, user: userEvent.setup() };
}

describe("LanguageMenu", () => {
  it("opens on trigger click and reflects it in aria-expanded", async () => {
    const { trigger, user } = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "English" })).toBeVisible();
  });

  it("closes after choosing a language", async () => {
    const { trigger, user } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "English", hidden: true }),
    ).not.toBeVisible();
  });

  it("closes on a click outside", async () => {
    const { trigger, user } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "English", hidden: true }),
    ).not.toBeVisible();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { trigger, user } = setup();
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
