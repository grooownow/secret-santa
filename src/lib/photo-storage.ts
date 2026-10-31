import "server-only";
import { del, put } from "@vercel/blob";
import { env } from "@/lib/env";

/** Server-side guard only: the browser compresses to about 500 KB first. */
export const MAX_PHOTO_BYTES = 900 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedPhotoType(type: string): boolean {
  return type in EXTENSIONS;
}

/**
 * Stores a photo and returns its URL. Uses Vercel Blob when
 * `BLOB_READ_WRITE_TOKEN` is set; otherwise (never in production) the photo
 * becomes a `data:` URL so local runs and tests need no storage.
 */
export async function storePhoto(file: File): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("unsupported photo type");

  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`photos/photo.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${bytes}`;
}

/** Removes stored photos. `data:` URLs and empty values need no cleanup. */
export async function deletePhotos(urls: string[]): Promise<void> {
  const remote = urls.filter((url) => url.startsWith("https://"));
  if (remote.length === 0 || !env.BLOB_READ_WRITE_TOKEN) return;
  await del(remote, { token: env.BLOB_READ_WRITE_TOKEN });
}
