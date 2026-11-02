import { cn } from "@/lib/utils";

/**
 * The content area of every page with a header. Forms and text keep a readable
 * 704px column on a wide screen; a screen laid out in several columns marks its
 * root with `data-wide` and gets the full 1120px.
 */
export function PageMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "santa-page flex flex-1 flex-col gap-5 py-8 lg:gap-8 lg:py-12",
        "[&>*:not([data-wide])]:max-w-176",
        className,
      )}
    >
      {children}
    </main>
  );
}
