import { render, screen } from "@testing-library/react";
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
