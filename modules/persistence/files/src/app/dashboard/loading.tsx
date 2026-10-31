// Skeleton placeholder (spec §5.6-4): animate-pulse blocks shaped like the
// real content, not a spinner — avoids a layout jump when the real page
// (which awaits requireUser()) resolves.
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-40 animate-pulse rounded-md" />
      </div>
      <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
    </div>
  );
}
