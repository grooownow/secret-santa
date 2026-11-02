import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { act } from "react";
import { Field, SelectInput, SubmitButton, TextInput } from "./form-ui";

describe("Field", () => {
  it("ties the hint and the error to the input and marks it invalid", () => {
    render(
      <Field label="Password" hint="At least 8 characters" error="Too short">
        <TextInput name="password" />
      </Field>,
    );
    const input = screen.getByLabelText("Password");
    const ids = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(["Too short", "At least 8 characters"]);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("leaves a valid field unmarked", () => {
    render(
      <Field label="Email">
        <TextInput name="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

describe("focus ring", () => {
  it("every focusable element gets a visible santa-green outline", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    expect(css).toMatch(
      /:focus-visible\s*{\s*outline:\s*2px solid var\(--santa-green\)/,
    );
  });
});

describe("placeholder", () => {
  it("is dimmed to half opacity, so it does not read as a filled value", () => {
    render(<TextInput name="city" placeholder="Madrid" />);
    expect(screen.getByRole("textbox")).toHaveClass("placeholder:opacity-50");
  });
});

describe("SelectInput", () => {
  it("draws its own muted chevron and keeps the text clear of it", () => {
    render(
      <Field label="Place">
        <SelectInput name="place" defaultValue="a">
          <option value="a">A very long option label</option>
        </SelectInput>
      </Field>,
    );
    const select = screen.getByLabelText("Place");
    // The native arrow is hidden, so only our chevron shows.
    expect(select).toHaveClass("appearance-none");
    // Right padding leaves room for the chevron (px-4 text + 2rem icon).
    expect(select).toHaveClass("pr-12");
    const chevron = select.parentElement?.querySelector("svg");
    expect(chevron).toHaveClass("text-santa-muted");
    expect(chevron).toHaveClass("pointer-events-none");
  });
});

describe("SubmitButton while the form is sending", () => {
  it("shows a spinner instead of the arrow and marks itself busy", async () => {
    let release: () => void = () => {};
    const action = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });
    render(
      <form action={action}>
        <SubmitButton pendingLabel="Сохраняем…">Сохранить</SubmitButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Сохранить" });
    expect(button.querySelector("[data-spinner]")).toBeNull();
    await act(async () => {
      button.click();
    });
    const busy = screen.getByRole("button", { name: "Сохраняем…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy.querySelector("[data-spinner]")).not.toBeNull();
    await act(async () => release());
  });
});
