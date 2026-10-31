"use client";

import { ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

const controlClass =
  "border-santa-line text-santa-ink placeholder:text-santa-muted focus-visible:border-santa-green h-[52px] w-full rounded-2xl border bg-santa-white px-4 text-base outline-none";

/** Labelled text input or select in the style of component n0DZBW. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-santa-green text-xs font-semibold">{label}</span>
      {children}
      {hint ? (
        <span className="text-santa-muted text-xs leading-relaxed">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function SelectInput(props: React.ComponentProps<"select">) {
  return <select {...props} className={cn(controlClass, props.className)} />;
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
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold disabled:opacity-60"
    >
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
      <ArrowUpRight className="size-[18px]" aria-hidden />
    </button>
  );
}

/** Secondary pill button (component pMCWW) as a link. */
export function LinkButton({
  href,
  children,
}: {
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold"
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
      className="text-santa-green text-[13px] font-semibold underline-offset-4 hover:underline"
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
