import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, TextInput } from "./form-ui";

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
