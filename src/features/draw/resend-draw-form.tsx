"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { resendDrawMail } from "./resend-action";

/** "Дослать": sends the draw mail to those who have not got it yet. */
export function ResendDrawForm() {
  const t = useTranslations("admin.draw");
  const [failed, setFailed] = useState(0);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const stats = await resendDrawMail().catch(() => null);
            setFailed(stats ? stats.failed : -1);
          })
        }
        className="border-santa-green text-santa-green flex h-12 w-full items-center justify-center rounded-full border px-6 text-base font-semibold disabled:opacity-60"
      >
        {pending ? t("resending") : t("resend")}
      </button>
      {failed !== 0 ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("resendFailed")}
        </p>
      ) : null}
    </div>
  );
}
