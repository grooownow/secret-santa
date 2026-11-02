"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { BroadcastEvent } from "@/features/mail";
import { resendBroadcast } from "./resend-broadcast-action";
import { Spinner } from "@/components/spinner";

/** "Дослать" for one mailing: sends it to those who have not got it yet. */
export function ResendBroadcastForm({ event }: { event: BroadcastEvent }) {
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
            const stats = await resendBroadcast(event).catch(() => null);
            setFailed(stats ? stats.failed : -1);
          })
        }
        aria-busy={pending || undefined}
        className="border-santa-green text-santa-green flex h-12 w-full items-center justify-center gap-2 rounded-full border px-6 text-base font-semibold disabled:opacity-60"
      >
        {pending ? t("resending") : t("resend")}
        {pending ? <Spinner /> : null}
      </button>
      {failed !== 0 ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("resendFailed")}
        </p>
      ) : null}
    </div>
  );
}
