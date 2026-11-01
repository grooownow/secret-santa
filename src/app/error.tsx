"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The server already logged this error (via onRequestError in
  // src/instrumentation.ts) before this client boundary rendered. Do not
  // console.log here — only surface the digest so a user can hand it to
  // support without leaking a stack trace.
  const t = useTranslations();
  return (
    <ErrorScreen
      digest={error.digest}
      onRetry={reset}
      labels={{
        appName: t("app.name"),
        title: t("error.title"),
        text: t("error.text"),
        uncertainTitle: t("error.uncertainTitle"),
        uncertainText: t("error.uncertainText"),
        retry: t("error.retry"),
        home: t("error.home"),
        reference: t("error.reference"),
      }}
    />
  );
}
