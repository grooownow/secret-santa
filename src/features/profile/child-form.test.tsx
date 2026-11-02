import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChildForm } from "./child-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("./save-child-action", () => ({ saveChildAction: vi.fn() }));

const defaults = { name: "Vasya", age: "7", gender: "", wishes: "", avoid: "" };

describe("ChildForm gender", () => {
  it("offers boy, girl and «not said», with «not said» chosen by default", () => {
    render(
      <ChildForm
        defaults={defaults}
        building="B"
        apartment="1"
        mode="create"
      />,
    );
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(["boy", "girl", ""]);
    expect(radios.map((r) => r.name)).toEqual(["gender", "gender", "gender"]);
    expect(radios.find((r) => r.checked)?.value).toBe("");
    expect(
      screen.getByRole("group", { name: "profile.child.gender" }),
    ).toBeTruthy();
  });

  it("keeps the saved gender when editing", () => {
    render(
      <ChildForm
        defaults={{ ...defaults, id: "c1", gender: "girl" }}
        building="B"
        apartment="1"
        mode="edit"
      />,
    );
    const girl = screen.getByRole("radio", {
      name: "profile.child.gender_girl",
    }) as HTMLInputElement;
    expect(girl.checked).toBe(true);
  });
});
