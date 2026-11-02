"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * "Are you sure?" as a modal: title, text, a primary «yes» and a secondary
 * «back». Closes with ✕, Esc, «back» or a click outside the window — all of
 * them mean "no". Built on <dialog> (focus trap and Esc for free).
 */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Backdrop click is a mouse shortcut; keyboard users have Esc and ✕.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="bg-santa-white backdrop:bg-santa-ink/40 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl p-0"
    >
      <div className="relative flex flex-col gap-4 p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="text-santa-ink hover:bg-santa-mint absolute top-3 right-3 flex size-10 items-center justify-center rounded-full"
        >
          <X className="size-5" aria-hidden />
        </button>
        <h2
          id="confirm-dialog-title"
          className="text-santa-ink pr-8 text-[22px] leading-tight font-bold"
        >
          {title}
        </h2>
        <p className="text-santa-muted text-sm leading-relaxed">{text}</p>
        <button
          type="button"
          onClick={onConfirm}
          className="bg-santa-green text-santa-white h-12 w-full rounded-full px-6 text-base font-semibold"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border-santa-green text-santa-green bg-santa-white h-12 w-full rounded-full border px-6 text-base font-semibold"
        >
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}
