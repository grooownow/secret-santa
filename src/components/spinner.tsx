"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** The one loading indicator: a turning circle in the current text colour. */
export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      data-spinner
      className={cn("size-[18px] shrink-0 animate-spin", className)}
      aria-hidden
    />
  );
}

/**
 * A spinner that shows only while the enclosing <form> is submitting. Drop it
 * into any submit button (server components too): it reads the form status
 * itself, so plain forms get feedback without becoming client components.
 * With `field`/`value` it shows only on the button that was pressed (one form,
 * several submit buttons, e.g. the language menu).
 */
export function PendingSpinner({
  className,
  field,
  value,
}: {
  className?: string;
  field?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  if (!pending) return null;
  if (field && data?.get(field) !== value) return null;
  return <Spinner className={className} />;
}
