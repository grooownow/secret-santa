"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { browserIo } from "./browser-io";
import { compressPhoto } from "./compress-photo";

interface PhotoInputProps {
  /** Saved photo to show before a new one is picked. */
  currentUrl?: string | null;
  /** Called with the compressed file, or null when cleared. */
  onChange: (file: File | null) => void;
  /** Reports that a photo is being prepared, so the form can wait. */
  onBusyChange?: (busy: boolean) => void;
  /** Name of the checkbox that asks the server to drop the saved photo. */
  removeName?: string;
  /** Message namespace with the same keys as `profile.photo`. */
  namespace?: "profile.photo" | "wall.photo";
}

/**
 * Photo picker with client-side compression. The raw file has no `name`, so
 * it is never submitted; the form adds the compressed result to its data.
 */
export function PhotoInput({
  currentUrl,
  onChange,
  onBusyChange,
  removeName,
  namespace = "profile.photo",
}: PhotoInputProps) {
  const t = useTranslations(namespace);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFailed(false);
    setBusy(true);
    onBusyChange?.(true);
    try {
      const small = await compressPhoto(file, browserIo);
      onChange(small);
      setPreview(
        typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(small)
          : null,
      );
    } catch {
      onChange(null);
      setPreview(null);
      setFailed(true);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const shown = preview ?? currentUrl ?? null;

  return (
    <div className="flex flex-col gap-2">
      {/* The whole mint block is the upload control: a label around the
          (visually hidden, still focusable) file input. */}
      <label
        data-testid="photo-block"
        className="bg-santa-mint hover:border-santa-green has-[input:focus-visible]:outline-santa-green flex cursor-pointer flex-col gap-3 rounded-2xl border border-transparent p-4 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2"
      >
        <span className="text-santa-green text-xs font-semibold">
          {t("title")}
        </span>
        <span className="flex items-center gap-4">
          <span className="bg-santa-white text-santa-green flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {shown ? (
              // Previews are local or Blob URLs of already compressed photos.
              <Image
                src={shown}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              <Camera className="size-6" aria-hidden />
            )}
          </span>
          <span className="text-santa-green text-sm font-semibold">
            {busy ? t("preparing") : shown ? t("change") : t("upload")}
          </span>
        </span>
        <span className="text-santa-muted text-xs leading-relaxed">
          {t("hint")}
        </span>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          data-testid="photo-file"
          aria-label={busy ? t("preparing") : shown ? t("change") : t("upload")}
          onChange={pick}
        />
      </label>
      {failed ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("failed")}
        </p>
      ) : null}
      {removeName && currentUrl && !preview ? (
        <label className="text-santa-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={removeName}
            className="accent-santa-green size-4"
          />
          {t("remove")}
        </label>
      ) : null}
    </div>
  );
}
