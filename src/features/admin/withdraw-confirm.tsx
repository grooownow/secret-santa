"use client";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { Unnotified } from "./withdraw";
import { UnnotifiedNotice } from "./unnotified-notice";
import { withdrawAction } from "./withdraw-action";

/** "Подтвердить выбытие" (frame ksxL7). Redirects are not errors. */
export function WithdrawConfirm({ id }: { id: string }) {
  const t = useTranslations("admin.withdraw");
  const [error, setError] = useState<"closed" | "notFound" | "failed" | null>(
    null,
  );
  const [unnotified, setUnnotified] = useState<Unnotified[] | null>(null);
  const [pending, startTransition] = useTransition();

  if (unnotified) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-santa-ink text-sm font-semibold">{t("done")}</p>
        <UnnotifiedNotice items={unnotified} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await withdrawAction(id);
              // Success redirects to the table; nothing comes back then.
              if (!result) return;
              if (!result.ok) setError(result.reason);
              else setUnnotified(result.unnotified);
            } catch (caught) {
              if (isRedirectError(caught)) throw caught;
              setError("failed");
            }
          })
        }
        className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold disabled:opacity-60"
      >
        {pending ? t("running") : t("confirm")}
      </button>
      {error ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}
