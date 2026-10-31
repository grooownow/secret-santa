import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  BLOB_READ_WRITE_TOKEN: "tok" as string | undefined,
  NODE_ENV: "production",
}));
const blob = vi.hoisted(() => ({
  del: vi.fn(async (_urls: string[], _o: unknown) => {}),
  list: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env }));
vi.mock("@vercel/blob", () => blob);

import { deleteAllPhotos, deletePhotos } from "./photo-storage";

beforeEach(() => {
  env.BLOB_READ_WRITE_TOKEN = "tok";
  env.NODE_ENV = "production";
  blob.del.mockClear();
  blob.list.mockReset();
});

describe("deletePhotos", () => {
  it("throws instead of silently skipping when the token is missing", async () => {
    env.BLOB_READ_WRITE_TOKEN = undefined;
    await expect(deletePhotos(["https://b/x.jpg"])).rejects.toThrow(/TOKEN/);
  });

  it("ignores data: urls without a token", async () => {
    env.BLOB_READ_WRITE_TOKEN = undefined;
    await expect(deletePhotos(["data:image/png;base64,AA"])).resolves.toBe(
      undefined,
    );
  });
});

describe("deleteAllPhotos", () => {
  it("also deletes blobs no row references, across pages, in chunks", async () => {
    blob.list
      .mockResolvedValueOnce({
        blobs: [{ url: "https://b/orphan.jpg" }],
        hasMore: true,
        cursor: "c1",
      })
      .mockResolvedValueOnce({
        blobs: Array.from({ length: 150 }, (_, i) => ({
          url: `https://b/o${i}.jpg`,
        })),
        hasMore: false,
      });
    await deleteAllPhotos(["https://b/known.jpg", "data:image/png;base64,AA"]);

    expect(blob.list).toHaveBeenNthCalledWith(1, {
      prefix: "photos/",
      cursor: undefined,
      token: "tok",
    });
    expect(blob.list.mock.calls[1]![0].cursor).toBe("c1");
    const deleted = blob.del.mock.calls.flatMap((c) => c[0]);
    expect(deleted).toContain("https://b/orphan.jpg");
    expect(deleted).toContain("https://b/known.jpg");
    expect(deleted).not.toContain("data:image/png;base64,AA");
    expect(deleted).toHaveLength(152);
    expect(blob.del.mock.calls.every((c) => c[0].length <= 100)).toBe(true);
  });

  it("fails when listing throws", async () => {
    blob.list.mockRejectedValue(new Error("list down"));
    await expect(deleteAllPhotos([])).rejects.toThrow("list down");
  });

  it("fails in production without a token", async () => {
    env.BLOB_READ_WRITE_TOKEN = undefined;
    await expect(deleteAllPhotos([])).rejects.toThrow(/TOKEN/);
  });
});
