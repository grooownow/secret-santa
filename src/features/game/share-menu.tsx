"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface ShareLabels {
  button: string;
  title: string;
  qrAlt: string;
  copy: string;
  copied: string;
}

const COPIED_MS = 2000;

/**
 * «Поделиться игрой» in the cabinet header: an icon button opening a popover
 * with the site QR code, the address and «Копировать». Behaves like the
 * language menu: closes on a click outside and on Esc, and Esc returns focus
 * to the button. «Скопировано» shows for about two seconds in a live region.
 */
export function ShareMenu({
  url,
  qr,
  labels,
}: {
  url: string;
  /** QR code of `url` as an image data URL. */
  qr: string;
  labels: ShareLabels;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard access: the address stays visible to copy by hand.
      setCopied(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={labels.button}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((value) => !value)}
        className="text-santa-ink hover:bg-santa-white flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <Share2 className="size-5" aria-hidden />
      </button>
      {open ? (
        // A non-modal <dialog open>: the page stays usable, like the
        // language menu.
        <dialog
          open
          id={`${id}-panel`}
          aria-label={labels.title}
          className="border-santa-line bg-santa-white text-santa-ink absolute top-full right-0 left-auto z-20 m-0 mt-2 flex w-72 max-w-[calc(100vw-3rem)] flex-col items-center gap-3 rounded-2xl border p-4 shadow-lg"
        >
          <p className="text-santa-ink self-start text-base font-bold">
            {labels.title}
          </p>
          {/* A data URL: next/image has nothing to optimise here. */}
          {/* oxlint-disable-next-line nextjs/no-img-element */}
          <img src={qr} alt={labels.qrAlt} width={200} height={200} />
          <p className="text-santa-ink w-full text-center text-sm break-all">
            {url}
          </p>
          <button
            type="button"
            onClick={copy}
            className="bg-santa-green text-santa-white flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {labels.copy}
          </button>
          <p aria-live="polite" className="text-santa-green min-h-5 text-sm">
            {copied ? labels.copied : ""}
          </p>
        </dialog>
      ) : null}
    </div>
  );
}
