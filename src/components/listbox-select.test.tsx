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
    trigger: screen.getByRole("combobox", { name: /Building/ }),
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
    const list = screen.getByRole("listbox");
    expect(list).toHaveFocus();
    expect(screen.getByRole("option", { name: "K" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
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
});
