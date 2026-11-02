"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A round photo thumbnail that opens the same photo full screen. Closes with
 * ✕, Esc or a click outside the picture, and gives focus back to the
 * thumbnail. The full view shows the stored file as is (photos are already
 * downscaled on upload), so opening it costs no extra request.
 */
export function PhotoZoom({
  src,
  alt,
  openLabel,
  closeLabel,
  size = 80,
  className,
}: {
  src: string;
  alt: string;
  /** e.g. «Открыть фото: Вася». */
  openLabel: string;
  closeLabel: string;
  size?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={openLabel}
        aria-haspopup="dialog"
        className="focus-visible:ring-santa-green shrink-0 cursor-zoom-in rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          className={className}
        />
      </button>
      {/* Backdrop click is a mouse shortcut; keyboard users have Esc and ✕. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        aria-label={alt}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // The picture's frame fills the dialog, so "outside the picture"
          // is the frame itself (data-backdrop) or the dialog edge.
          const target = event.target as HTMLElement;
          if (target === event.currentTarget || "backdrop" in target.dataset) {
            setOpen(false);
          }
        }}
        className="backdrop:bg-santa-ink/90 m-auto max-h-none max-w-none bg-transparent p-0"
      >
        {open ? (
          <div
            data-backdrop
            className="relative flex h-dvh w-screen items-center justify-center p-4"
          >
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={1200}
              unoptimized
              className="max-h-full w-auto max-w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="bg-santa-white text-santa-ink absolute top-4 right-4 flex size-11 items-center justify-center rounded-full"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
