import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageLoading } from "./page-loading";

describe("PageLoading", () => {
  it("announces loading to screen readers and marks itself busy", () => {
    render(<PageLoading label="Загружаем…" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toBe("Загружаем…");
  });
});
