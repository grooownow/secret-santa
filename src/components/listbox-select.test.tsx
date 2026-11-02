import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Field } from "./form-ui";
import { ListboxSelect } from "./listbox-select";

const HOUSES = [
  { value: "K", label: "K" },
  { value: "B", label: "B" },
  { value: "D", label: "D" },
];

function renderPicker(defaultValue = "") {
  render(
    <form aria-label="profile">
      <Field label="Building">
        <ListboxSelect
          name="building"
          options={HOUSES}
          defaultValue={defaultValue}
          placeholder="Choose"
        />
      </Field>
      <button type="button">outside</button>
    </form>,
  );
  const form = screen.getByRole("form", { name: "profile" }) as HTMLFormElement;
  return {
    trigger: screen.getByRole("combobox", { name: "Building" }),
    value: () => new FormData(form).get("building"),
  };
}

describe("ListboxSelect", () => {
  it("picks with the mouse and hands the value to the form", async () => {
    const { trigger, value } = renderPicker();
    expect(value()).toBe("");
    expect(trigger).toHaveTextContent("Choose");

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("option", { name: "B" }));

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(value()).toBe("B");
    expect(trigger).toHaveTextContent("B");
  });

  it("picks with the keyboard: arrows and Enter, focus goes back", async () => {
    const { trigger, value } = renderPicker("K");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    // Select-only combobox: focus stays on it and points at the option.
    const list = screen.getByRole("listbox", { name: "Building" });
    expect(trigger).toHaveFocus();
    const k = screen.getByRole("option", { name: "K" });
    expect(k).toHaveAttribute("aria-selected", "true");
    expect(trigger).toHaveAttribute("aria-activedescendant", k.id);
    expect(list).toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(value()).toBe("D");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("Esc and a click outside close it without changing the value", async () => {
    const { trigger, value } = renderPicker("K");
    await userEvent.click(trigger);
    await userEvent.keyboard("{ArrowDown}{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(value()).toBe("K");

    await userEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(value()).toBe("K");
  });

  it("typeahead: a letter jumps to the option starting with it", async () => {
    const { trigger, value } = renderPicker("K");
    trigger.focus();
    await userEvent.keyboard("d");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "D" }).id,
    );
    await userEvent.keyboard("b{Enter}");
    expect(value()).toBe("B");
  });

  it("dims the placeholder but not a chosen value", () => {
    const { trigger } = renderPicker();
    expect(screen.getByText("Choose")).toHaveClass("opacity-50");
    expect(trigger).toBeInTheDocument();
  });

  it("shows a chosen value at full strength", () => {
    renderPicker("K");
    expect(screen.getByRole("combobox").querySelector("span")).not.toHaveClass(
      "opacity-50",
    );
  });

  it("closes when focus leaves the combobox", async () => {
    const { trigger, value } = renderPicker("K");
    await userEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(value()).toBe("K");
  });
});
