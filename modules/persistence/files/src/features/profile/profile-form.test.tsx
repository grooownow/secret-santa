import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileForm } from "./profile-form";
import type { updateName } from "./update-name-action";

/** Deferred promise helper so we can assert on the pending/optimistic state
 * before deliberately resolving the mocked action, instead of racing a
 * `setTimeout`. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("ProfileForm", () => {
  it("renders the current name as the input's value", () => {
    render(<ProfileForm currentName="Original Name" action={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Original Name");
  });

  it("shows a validation error tied to the input when the action rejects the name", async () => {
    const user = userEvent.setup();
    const action: typeof updateName = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Name is required" });

    render(<ProfileForm currentName="Original Name" action={action} />);

    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Name is required");

    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("calls the action with the new name and shows it optimistically before the action resolves", async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<{ ok: true }>();
    const action = vi.fn().mockReturnValue(promise);

    render(<ProfileForm currentName="Original Name" action={action} />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Optimistic value is shown while the action's promise is still pending.
    expect(await screen.findByText("New Name")).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith({ name: "New Name" });
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    resolve({ ok: true });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
        "aria-busy",
        "false",
      ),
    );
  });
});
