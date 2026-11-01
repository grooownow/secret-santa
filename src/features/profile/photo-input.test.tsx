import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compressPhoto,
  TARGET_BYTES,
  type DecodedImage,
  type PhotoIo,
} from "./compress-photo";
import { PhotoInput } from "./photo-input";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const fake = vi.hoisted(() => ({
  decode: vi.fn(),
  encode: vi.fn(),
  convertHeic: vi.fn(),
}));
vi.mock("./browser-io", () => ({ browserIo: fake }));

/** Output size grows with pixels and quality, like a real JPEG. */
function sizeOf(width: number, height: number, quality: number): number {
  return Math.round(width * height * quality * 1.2);
}

beforeEach(() => {
  fake.decode.mockReset();
  fake.encode.mockReset();
  fake.convertHeic.mockReset();
  fake.encode.mockImplementation(
    async (_img: DecodedImage, w: number, h: number, q: number) =>
      new Blob([new Uint8Array(sizeOf(w, h, q))]),
  );
});

const twelveMb = () =>
  new File([new Uint8Array(12 * 1024 * 1024)], "IMG_0001.jpg", {
    type: "image/jpeg",
  });

describe("compressPhoto", () => {
  it("a large photo is compressed below 500 KB, with no input size limit", async () => {
    fake.decode.mockResolvedValue({ width: 4032, height: 3024 });
    const input = twelveMb();
    expect(input.size).toBeGreaterThan(10 * 1024 * 1024);

    const out = await compressPhoto(input, fake as PhotoIo);

    expect(out.type).toBe("image/jpeg");
    expect(out.size).toBeLessThanOrEqual(TARGET_BYTES);
    const [, width, height] = fake.encode.mock.calls[0] as [
      unknown,
      number,
      number,
    ];
    expect(Math.max(width, height)).toBeLessThanOrEqual(1024);
  });

  it("lowers the quality step by step until the target is met", async () => {
    fake.decode.mockResolvedValue({ width: 1024, height: 1024 });
    const out = await compressPhoto(twelveMb(), fake as PhotoIo);
    expect(out.size).toBeLessThanOrEqual(TARGET_BYTES);
    expect(fake.encode.mock.calls.length).toBeGreaterThan(1);
  });

  it("a HEIC photo goes through the converter and is saved", async () => {
    fake.decode
      .mockRejectedValueOnce(new Error("cannot decode"))
      .mockResolvedValueOnce({ width: 3000, height: 2000 });
    fake.convertHeic.mockResolvedValue(new Blob([new Uint8Array(100)]));
    const heic = new File([new Uint8Array(2000)], "IMG.HEIC", {
      type: "image/heic",
    });

    const out = await compressPhoto(heic, fake as PhotoIo);

    expect(fake.convertHeic).toHaveBeenCalledOnce();
    expect(out.size).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it("does not load the converter for a photo the browser can open", async () => {
    fake.decode.mockResolvedValue({ width: 800, height: 600 });
    await compressPhoto(twelveMb(), fake as PhotoIo);
    expect(fake.convertHeic).not.toHaveBeenCalled();
  });
});

function Harness({ onPhoto }: { onPhoto: (f: File | null) => void }) {
  const [text, setText] = useState("");
  return (
    <form>
      <input
        aria-label="wishes"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <PhotoInput onChange={onPhoto} />
    </form>
  );
}

describe("PhotoInput", () => {
  it("hands the compressed file to the form", async () => {
    fake.decode.mockResolvedValue({ width: 4000, height: 3000 });
    const onPhoto = vi.fn();
    render(<Harness onPhoto={onPhoto} />);
    const input = await screen.findByTestId("photo-file");

    await userEvent.upload(input, twelveMb());

    await waitFor(() => expect(onPhoto).toHaveBeenCalled());
    const file = onPhoto.mock.calls.at(-1)?.[0] as File;
    expect(file.size).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it("a photo that fails even the converter shows an error and keeps typed text", async () => {
    fake.decode.mockRejectedValue(new Error("cannot decode"));
    fake.convertHeic.mockRejectedValue(new Error("not a heic"));
    const onPhoto = vi.fn();
    render(<Harness onPhoto={onPhoto} />);
    await userEvent.type(await screen.findByLabelText("wishes"), "books");

    await userEvent.upload(
      screen.getByTestId("photo-file"),
      new File([new Uint8Array(50)], "broken.heic", { type: "image/heic" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("failed");
    expect(screen.getByLabelText("wishes")).toHaveValue("books");
    expect(onPhoto).toHaveBeenLastCalledWith(null);
  });
});

describe("PhotoInput block", () => {
  it("the whole mint block opens the file chooser, not only the link text", async () => {
    render(<PhotoInput onChange={vi.fn()} />);
    const input = screen.getByTestId("photo-file");
    const opened = vi.fn();
    input.addEventListener("click", opened);

    // The block's title and hint are part of the control too.
    await userEvent.click(screen.getByText("title"));
    await userEvent.click(screen.getByText("hint"));
    expect(opened).toHaveBeenCalledTimes(2);
    // Its accessible name says what it does.
    expect(screen.getByLabelText(/upload/)).toBe(input);
  });
});
