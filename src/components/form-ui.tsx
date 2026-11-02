"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cloneElement, isValidElement, useId } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const controlClass =
  "border-santa-line text-santa-ink placeholder:text-santa-muted focus-visible:border-santa-green h-[52px] w-full rounded-2xl border bg-santa-white px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-santa-green";

/**
 * Labelled text input or select in the style of component n0DZBW. The hint
 * and the error are tied to the control with `aria-describedby`, and an error
 * marks it `aria-invalid`, so screen readers read them with the field.
 */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  /** Error about this field only; shown under it. */
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const labelId = `${id}-label`;
  const control = isValidElement<{
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    "aria-labelledby"?: string;
  }>(children)
    ? cloneElement(children, {
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        // Custom widgets (ListboxSelect) that are not a labelable element
        // ask for the label by id; native controls get it from <label>.
        ...((children.type as { labelledByField?: boolean }).labelledByField
          ? { "aria-labelledby": labelId }
          : {}),
      })
    : children;
  return (
    // Hint and error sit outside the <label>, so they are not read as part
    // of the field's name, only as its description.
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span
          id={labelId}
          className="text-santa-green text-xs font-semibold lg:text-sm"
        >
          {label}
        </span>
        {control}
      </label>
      {hint ? (
        <span id={hintId} className="text-santa-muted text-xs leading-relaxed">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="text-santa-danger text-xs">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

/**
 * Native select with its own chevron: the browser arrow is hidden, a muted
 * chevron sits on the right and the right padding (pr-12) keeps long option
 * text from running under it.
 */
export function SelectInput(props: React.ComponentProps<"select">) {
  return (
    <span className="relative flex w-full">
      <select
        {...props}
        className={cn(
          controlClass,
          "cursor-pointer appearance-none pr-12",
          props.className,
        )}
      />
      <ChevronDown
        aria-hidden
        className="text-santa-muted pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
      />
    </span>
  );
}

export function TextAreaInput(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        controlClass,
        "h-auto min-h-28 resize-y py-3 leading-relaxed",
        props.className,
      )}
    />
  );
}

/** Checkbox with a text label; `invalid` marks the one the error is about. */
export function CheckboxRow({
  name,
  invalid,
  children,
}: {
  name: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="text-santa-ink flex items-start gap-3 text-sm leading-relaxed">
      <input
        type="checkbox"
        name={name}
        required
        aria-invalid={invalid || undefined}
        className="accent-santa-green mt-0.5 size-5 shrink-0"
      />
      <span>{children}</span>
    </label>
  );
}

/** Primary pill button (component ZRYcz); disabled while the action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  /** Replaces the default ↗ arrow when the action is not "go somewhere". */
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold disabled:opacity-60"
    >
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
      {/* While the request runs the arrow turns into a spinner. */}
      {pending ? (
        <Spinner />
      ) : (
        (icon ?? <ArrowUpRight className="size-[18px]" aria-hidden />)
      )}
    </button>
  );
}

/** Secondary pill button (component pMCWW) as a link. */
export function LinkButton({
  href,
  children,
  className,
}: {
  href: Route;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowUpRight className="size-[18px]" aria-hidden />
    </Link>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-santa-green text-[13px] font-semibold underline-offset-4 hover:underline lg:text-sm"
    >
      {children}
    </Link>
  );
}

/** Error box in the style of frame fCfVC. */
export function FormAlert({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="bg-santa-danger-bg text-santa-danger flex flex-col gap-1 rounded-2xl p-4 text-sm leading-relaxed"
    >
      {title ? <p className="text-base font-bold">{title}</p> : null}
      <p>{children}</p>
    </div>
  );
}

/** "Or" divider between the Google button and the email form. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="bg-santa-line h-px flex-1" />
      <span className="text-santa-muted text-xs">{label}</span>
      <div className="bg-santa-line h-px flex-1" />
    </div>
  );
}
