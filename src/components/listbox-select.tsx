"use client";

// A native <select> cannot be styled or made to always open downward, which
// is the reason this component exists: the ARIA combobox + listbox pattern is
// its replacement. Keys are handled by the listbox (aria-activedescendant);
// the options are never focused themselves.
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events */

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ListboxOption {
  value: string;
  label: string;
}

/**
 * A select in our own style (ARIA "select-only combobox" pattern): a button
 * shows the choice, a listbox always opens under it. The value goes to the
 * form through a hidden input named `name`, so a server action reads it like
 * a native select. Keyboard: arrows/Home/End move, Enter or Space picks, Esc
 * closes; a click outside closes too. `aria-describedby`/`aria-invalid` come
 * from `Field`, which clones its child.
 */
export function ListboxSelect({
  name,
  options,
  defaultValue = "",
  placeholder,
  ...aria
}: {
  name: string;
  options: readonly ListboxOption[];
  defaultValue?: string;
  placeholder: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function show() {
    const index = options.findIndex((o) => o.value === value);
    setActive(index < 0 ? 0 : index);
    setOpen(true);
  }

  function pick(index: number) {
    const option = options[index];
    if (option) setValue(option.value);
    setOpen(false);
    button.current?.focus();
  }

  function onButtonKey(event: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      show();
    }
  }

  function onListKey(event: React.KeyboardEvent) {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] as number);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative w-full">
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
        className={cn(
          "border-santa-line focus-visible:border-santa-green bg-santa-white focus-visible:outline-santa-green flex h-[52px] w-full items-center justify-between rounded-2xl border pr-4 pl-4 text-left text-base focus-visible:outline-2 focus-visible:outline-offset-2",
          selected ? "text-santa-ink" : "text-santa-muted",
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "text-santa-muted size-5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
          className="border-santa-line bg-santa-white absolute top-full right-0 left-0 z-20 mt-2 flex flex-col gap-1 rounded-2xl border p-2 shadow-lg focus:outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                id={`${id}-opt-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                onPointerEnter={() => setActive(index)}
                onClick={(event) => {
                  // The listbox sits inside Field's <label>; without this the
                  // label would forward the click to the button again.
                  event.preventDefault();
                  pick(index);
                }}
                className={cn(
                  "text-santa-ink flex h-12 cursor-pointer items-center justify-between rounded-xl px-3 text-lg font-semibold",
                  index === active && "bg-santa-mint",
                  isSelected && "text-santa-green",
                )}
              >
                {option.label}
                {isSelected ? (
                  <Check className="text-santa-green size-5" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
