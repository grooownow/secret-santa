import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { PhotoZoom } from "./photo-zoom";

// jsdom has no modal dialogs; model what showModal/close toggle.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

function setup() {
  render(
    <PhotoZoom
      src="https://x.public.blob.vercel-storage.com/a.jpg"
      alt="Фото: Вася"
      openLabel="Открыть фото: Вася"
      closeLabel="Закрыть фото"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Открыть фото: Вася" }));
  const dialog = document.querySelector("dialog")!;
  return dialog;
}

describe("PhotoZoom", () => {
  it("opens the photo full screen from the thumbnail", () => {
    const dialog = setup();
    expect(dialog.open).toBe(true);
    // The full view shows the same file again, large.
    const imgs = dialog.querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]?.getAttribute("src")).toContain("a.jpg");
  });

  it("closes with ✕", () => {
    const dialog = setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Закрыть фото", hidden: true }),
    );
    expect(dialog.open).toBe(false);
  });

  it("closes on a click around the photo, not on the photo itself", () => {
    const dialog = setup();
    fireEvent.click(dialog.querySelector("img")!);
    expect(dialog.open).toBe(true);
    fireEvent.click(dialog.querySelector("[data-backdrop]")!);
    expect(dialog.open).toBe(false);
  });
});
