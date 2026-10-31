"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { withdrawAction } from "./withdraw-action";

/** "Подтвердить выбытие" (frame ksxL7); shows the refusal if the date passed. */
export function WithdrawConfirm({ id }: { id: string }) {
  const t = useTranslations("admin.withdraw");
  const [error, setError] = useState<"closed" | "notFound" | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await withdrawAction(id).catch(() => null);
            setError(result ? result.reason : "closed");
          })
        }
        className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold disabled:opacity-60"
      >
        {pending ? t("running") : t("confirm")}
      </button>
      {error ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t(error === "closed" ? "closed" : "notFound")}
        </p>
      ) : null}
    </div>
  );
}
