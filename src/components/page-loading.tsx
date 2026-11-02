/**
 * Placeholder shown by `loading.tsx` while a cabinet or admin page renders on
 * the server. Its job is instant feedback: the layout (header, tabs, bottom
 * menu) stays, and the content area turns into neutral blocks the moment a
 * link is pressed, instead of the old page sitting still until the new one
 * arrives. `<output>` is a live status region, so screen readers hear the
 * label once.
 */
export function PageLoading({ label }: { label: string }) {
  return (
    <output aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="bg-santa-mint h-8 w-2/3 animate-pulse rounded-xl" />
      <div className="bg-santa-mint h-4 w-full animate-pulse rounded-lg" />
      <div className="bg-santa-mint h-4 w-5/6 animate-pulse rounded-lg" />
      <div className="bg-santa-mint h-28 w-full animate-pulse rounded-2xl" />
      <div className="bg-santa-mint h-28 w-full animate-pulse rounded-2xl" />
    </output>
  );
}
