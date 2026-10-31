export const MAX_SIDE = 1024;
export const TARGET_BYTES = 500 * 1024;

export interface DecodedImage {
  width: number;
  height: number;
}

/** Browser primitives behind `compressPhoto`, replaceable in tests. */
export interface PhotoIo {
  decode(blob: Blob): Promise<DecodedImage>;
  encode(
    image: DecodedImage,
    width: number,
    height: number,
    quality: number,
  ): Promise<Blob>;
  /** Converts a HEIC/HEIF photo to JPEG (lazy-loaded library). */
  convertHeic(file: Blob): Promise<Blob>;
}

export class PhotoError extends Error {}

const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
const MAX_SHRINKS = 4;

/**
 * Shrinks any photo to a JPEG of at most 1024 px and about 500 KB. There is
 * no limit on the input size. A file the browser cannot decode (HEIC outside
 * Safari) goes through the HEIC converter first; only if that fails too a
 * `PhotoError` is thrown.
 */
export async function compressPhoto(file: File, io: PhotoIo): Promise<File> {
  let source: Blob = file;
  let image: DecodedImage;
  try {
    image = await io.decode(source);
  } catch {
    try {
      source = await io.convertHeic(file);
      image = await io.decode(source);
    } catch {
      throw new PhotoError("photo cannot be decoded");
    }
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));

  let best: Blob | null = null;
  for (let shrink = 0; shrink <= MAX_SHRINKS; shrink += 1) {
    for (const quality of QUALITIES) {
      // Sequential on purpose: each try depends on the previous size.
      // oxlint-disable-next-line no-await-in-loop
      const blob = await io.encode(image, width, height, quality);
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= TARGET_BYTES) return toFile(blob);
    }
    width = Math.max(1, Math.round(width * 0.8));
    height = Math.max(1, Math.round(height * 0.8));
  }
  if (!best) throw new PhotoError("photo cannot be encoded");
  return toFile(best);
}

function toFile(blob: Blob): File {
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
