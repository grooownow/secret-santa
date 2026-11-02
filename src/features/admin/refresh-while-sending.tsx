"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * A mailing runs after the response that started it (see runAfterResponse),
 * so the overview rendered right after the draw still says "sent 0 of N".
 * While a fresh mailing is unfinished, re-render the server page every few
 * seconds; give up after two minutes ("Дослать" covers a stuck run).
 */
export function RefreshWhileSending({
  everyMs = 3000,
  forMs = 120_000,
}: {
  everyMs?: number;
  forMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started > forMs) clearInterval(id);
      else router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, forMs]);
  return null;
}
