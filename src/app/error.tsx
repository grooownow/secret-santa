"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The server already logged this error (via onRequestError in
  // src/instrumentation.ts, which calls src/lib/logger.ts) before this
  // client boundary rendered. Do not console.log here — only surface the
  // digest so a user can hand it to support without leaking a stack trace.
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        An unexpected error occurred. You can try again, and if the problem
        persists, share the reference below with support.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
