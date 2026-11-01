"use client";

// A native <select> cannot be styled or made to always open downward, which
// is the reason this component exists. It follows ONE pattern, the WAI-ARIA
// APG "select-only combobox": DOM focus stays on the combobox the whole time,
// which owns all keys and points at the active option with
// aria-activedescendant; the options are never focused themselves.
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events */

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import { cn } from "@/lib/utils";

export interface ListboxOption {
  value: string;
  label: string;
}

/**
 * A select in our own style. The combobox shows the choice; the listbox
 * always opens under it. The value goes to the form through a hidden input
 * named `name`, so a server action reads it like a native select.
 *
 * Keyboard (focus never leaves the combobox): ↓/↑/Enter/Space/Home/End open;
 * while open ↓/↑/Home/End move, Enter or Space picks, Esc closes, Tab closes;
 * typing a letter jumps to the next option starting with it (typeahead).
 * A click outside or focus leaving the combobox closes the list.
 *
 * `aria-labelledby`, `aria-describedby` and `aria-invalid` come from
 * `Field`, which clones its child (see `labelledByField`).
 */
export function ListboxSelect({
  name,
  options,
  defaultValue = "",
  placeholder,
  onValueChange,
  ref,
  ...aria
}: {
  name: string;
  options: readonly ListboxOption[];
  defaultValue?: string;
  placeholder: string;
  /** Called with the new value after a pick. */
  onValueChange?: (value: string) => void;
  /** The combobox element, e.g. to focus it on a validation error. */
  ref?: Ref<HTMLButtonElement>;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const last = options.length - 1;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function show(index?: number) {
    const current = options.findIndex((o) => o.value === value);
    setActive(index ?? (current < 0 ? 0 : current));
    setOpen(true);
  }

  function pick(index: number) {
    const option = options[index];
    if (option) {
      setValue(option.value);
      onValueChange?.(option.value);
    }
    setOpen(false);
  }

  /** Next option (after the active one, wrapping) that starts with `char`. */
  function typeahead(char: string): number | undefined {
    const wanted = char.toLowerCase();
    for (let step = 1; step <= options.length; step++) {
      const index = (active + step) % options.length;
      if (options[index]?.label.toLowerCase().startsWith(wanted)) return index;
    }
    return undefined;
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const { key } = event;
    if (key.length === 1 && key !== " " && !event.metaKey && !event.ctrlKey) {
      const index = typeahead(key);
      if (index === undefined) return;
      event.preventDefault();
      if (open) setActive(index);
      else show(index);
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " ", "Home", "End"].includes(key)) {
        event.preventDefault();
        show(key === "Home" ? 0 : key === "End" ? last : undefined);
      }
      return;
    }
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (key in moves) {
      event.preventDefault();
      setActive(moves[key] as number);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      pick(active);
    } else if (key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative w-full">
      <input type="hidden" name={name} value={value} />
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-labelledby={aria["aria-labelledby"]}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className={cn(
          "border-santa-line focus-visible:border-santa-green bg-santa-white focus-visible:outline-santa-green aria-[invalid=true]:border-santa-danger flex h-[52px] w-full items-center justify-between rounded-2xl border pr-4 pl-4 text-left text-base focus-visible:outline-2 focus-visible:outline-offset-2",
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
          id={listId}
          role="listbox"
          aria-labelledby={aria["aria-labelledby"]}
          className="border-santa-line bg-santa-white absolute top-full right-0 left-0 z-20 mt-2 flex flex-col gap-1 rounded-2xl border p-2 shadow-lg"
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
                // Keeps focus on the combobox, so its blur does not close
                // the list before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  // The listbox sits inside Field's <label>; without this the
                  // label would forward the click to the combobox again.
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

/** Tells `Field` to pass its label id as `aria-labelledby`. */
ListboxSelect.labelledByField = true;
