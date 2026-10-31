"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/form-ui";
import { ORGANIZER_TELEGRAM } from "@/lib/organizer";
import { retryNotify } from "./withdraw-action";
import type { Unnotified } from "./withdraw";

/**
 * Shown when the withdrawal went through but some givers did not get their
 * mail: a retry button and the hint to write to them in Telegram.
 */
export function UnnotifiedNotice({ items }: { items: Unnotified[] }) {
  const t = useTranslations("admin.withdraw");
  const [left, setLeft] = useState(items);
  const [pending, startTransition] = useTransition();

  if (left.length === 0) {
    return (
      <output className="text-santa-green text-sm font-semibold">
        {t("notifiedAll")}
      </output>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <FormAlert title={t("unnotifiedTitle")}>
        {t("unnotifiedText", { count: left.length })}
      </FormAlert>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const failed = await retryNotify(left).catch(() => left);
            setLeft(failed);
          })
        }
        className="border-santa-green text-santa-green flex h-12 w-full items-center justify-center rounded-full border px-6 text-base font-semibold disabled:opacity-60"
      >
        {pending ? t("retrying") : t("retry")}
      </button>
      <a
        href={ORGANIZER_TELEGRAM}
        target="_blank"
        rel="noopener noreferrer"
        className="text-santa-green text-[13px] font-semibold underline-offset-4 hover:underline"
      >
        {t("telegramHint")}
      </a>
    </div>
  );
}
