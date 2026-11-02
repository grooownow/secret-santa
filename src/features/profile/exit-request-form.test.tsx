import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExitRequestForm } from "./exit-request-form";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("./exit-request-action", () => ({ requestExitAction: vi.fn() }));

const anna = {
  id: "a",
  name: "Anna",
  kind: "adult" as const,
  requested: false,
};
const kid = { id: "k", name: "Kid", kind: "child" as const, requested: false };

describe("ExitRequestForm", () => {
  it("one participant: no picker, an optional comment and the button", () => {
    render(<ExitRequestForm people={[anna]} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(
      (
        document.querySelector(
          'input[name="participantId"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("a");
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "settings.exit.submit" }),
    ).toBeTruthy();
  });

  it("a family picks who cannot play; those already asked are left out", () => {
    render(<ExitRequestForm people={[anna, { ...kid, requested: false }]} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);

    const { container } = render(
      <ExitRequestForm people={[{ ...anna, requested: true }, kid]} />,
    );
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(
      (
        container.querySelector(
          'input[name="participantId"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("k");
  });

  it("everyone asked: nothing to send", () => {
    const { container } = render(
      <ExitRequestForm people={[{ ...anna, requested: true }]} />,
    );
    expect(container.querySelector("form")).toBeNull();
  });
});
