"use client";

import { useTranslations } from "next-intl";

/** Opens the browser's print dialog; the page hides everything but the QR. */
export function PrintButton() {
  const t = useTranslations("admin.settings");
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border-santa-green text-santa-green flex h-12 w-full items-center justify-center rounded-full border px-6 text-base font-semibold"
    >
      {t("print")}
    </button>
  );
}
