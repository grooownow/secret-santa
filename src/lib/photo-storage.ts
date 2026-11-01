import "server-only";
import { del, list, put } from "@vercel/blob";
import { env } from "@/lib/env";

/** Server-side guard only: the browser compresses to about 500 KB first. */
export const MAX_PHOTO_BYTES = 900 * 1024;

/** Every stored photo lives under this prefix (see `storePhoto`). */
export const PHOTO_PREFIX = "photos/";

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
 * `BLOB_READ_WRITE_TOKEN` is set; otherwise (never on a real deployment; the
 * local e2e production build is allowed) the photo becomes a `data:` URL so
 * local runs and tests need no storage.
 */
export async function storePhoto(file: File): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("unsupported photo type");

  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${PHOTO_PREFIX}photo.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }
  // The local e2e run is a production build without Blob; E2E_MAIL_OUTBOX
  // marks it and src/lib/env.ts refuses it on any real deployment.
  if (env.NODE_ENV === "production" && !env.E2E_MAIL_OUTBOX) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${bytes}`;
}

const DELETE_CHUNK = 100;

async function deleteChunked(urls: string[], token: string): Promise<void> {
  for (let i = 0; i < urls.length; i += DELETE_CHUNK) {
    // Sequential on purpose: keeps each call small and the order simple.
    await del(urls.slice(i, i + DELETE_CHUNK), { token });
  }
}

/**
 * Removes stored photos. `data:` URLs and empty values need no cleanup.
 * Throws when remote URLs exist but no Blob token is configured: silently
 * skipping would leave the files behind.
 */
export async function deletePhotos(urls: string[]): Promise<void> {
  const remote = urls.filter((url) => url.startsWith("https://"));
  if (remote.length === 0) return;
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set: cannot delete photos");
  }
  await deleteChunked(remote, env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Purge path: deletes every photo in the store, not just the ones rows still
 * reference, because best-effort deletes elsewhere can leave orphans. The
 * `known` URLs are merged with a full listing of the photo prefix. Throws on
 * any failure so the caller does not mark the purge as done. In production a
 * missing token is an error too.
 */
export async function deleteAllPhotos(known: string[]): Promise<void> {
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    if (env.NODE_ENV === "production") {
      throw new Error("BLOB_READ_WRITE_TOKEN is not set: cannot purge photos");
    }
    // Local runs store data: URLs only; fail if remote ones exist anyway.
    return deletePhotos(known);
  }
  const all = new Set(known.filter((url) => url.startsWith("https://")));
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PHOTO_PREFIX, cursor, token });
    for (const blob of page.blobs) all.add(blob.url);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  await deleteChunked([...all], token);
}
