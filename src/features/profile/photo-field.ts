import {
  isAllowedPhotoType,
  MAX_PHOTO_BYTES,
  storePhoto,
} from "@/lib/photo-storage";
import type { ProfileError } from "./state";

export type PhotoInput =
  | { kind: "none" }
  | { kind: "new"; url: string }
  | { kind: "error"; error: ProfileError };

/** Reads the optional `photo` file of a form and stores it. */
export async function readPhoto(formData: FormData): Promise<PhotoInput> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { kind: "none" };
  if (file.size > MAX_PHOTO_BYTES) {
    return { kind: "error", error: "photoTooLarge" };
  }
  if (!isAllowedPhotoType(file.type)) return { kind: "error", error: "photo" };
  try {
    return { kind: "new", url: await storePhoto(file) };
  } catch {
    return { kind: "error", error: "photo" };
  }
}
