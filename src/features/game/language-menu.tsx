"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Open/close behaviour of the header language picker. The server component
 * passes the (already translated) form in as `children`; this wrapper only
 * owns the disclosure state: closes on select (form submit), on a click
 * outside, and on Escape (focus returns to the trigger).
 */
export function LanguageMenu({
  label,
  current,
  children,
}: {
  label: string;
  current: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="text-santa-ink flex cursor-pointer items-center gap-1 text-xs"
      >
        {current}
        <ChevronDown
          aria-hidden
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {/* Stays mounted while closed so the submitting form is not torn down
          mid-action; submit bubbles up here. */}
      <div hidden={!open} onSubmit={() => setOpen(false)}>
        {children}
      </div>
    </div>
  );
}
