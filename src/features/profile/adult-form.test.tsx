import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdultForm } from "./adult-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("./save-adult-action", () => ({ saveAdultAction: vi.fn() }));

const defaults = {
  name: "Alice",
  building: "K",
  apartment: "12",
  wishes: "",
  avoid: "",
  photoUrl: null,
};

describe("AdultForm", () => {
  it("the flat field has no example hint under it", () => {
    render(<AdultForm defaults={defaults} mode="edit" />);
    const flat = screen.getByLabelText("profile.adult.apartment");
    expect(flat).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("profile.adult.apartmentHint")).toBeNull();
  });
});

describe("AdultForm house field", () => {
  it("saving without a house is blocked with an error on the house field", async () => {
    const { saveAdultAction } = await import("./save-adult-action");
    render(
      <AdultForm defaults={{ ...defaults, building: "" }} mode="create" />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "profile.adult.create" }),
    );

    const house = screen.getByRole("combobox", {
      name: "profile.adult.building",
    });
    expect(house).toHaveAttribute("aria-invalid", "true");
    expect(house).toHaveAccessibleDescription("profile.adult.buildingRequired");
    expect(house).toHaveFocus();
    expect(saveAdultAction).not.toHaveBeenCalled();

    // Picking a house clears the error.
    await userEvent.click(house);
    await userEvent.click(screen.getByRole("option", { name: "K" }));
    expect(house).not.toHaveAttribute("aria-invalid");
  });
});
