"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  deleteAccountAction,
  type DeleteAccountState,
} from "./delete-account-action";
import { Spinner } from "@/components/spinner";

const initial: DeleteAccountState = {};

/** "Да, удалить аккаунт" (frame r30NS): the red link-style confirmation. */
export function DeleteAccountForm() {
  const t = useTranslations("settings.delete");
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initial,
  );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="confirm" value="yes" />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="text-santa-danger flex items-center gap-1.5 self-start text-[13px] font-semibold underline-offset-4 hover:underline disabled:opacity-60"
      >
        {pending ? t("deleting") : t("confirm")}
        {pending ? <Spinner className="size-3.5" /> : null}
      </button>
      {state.error ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t(state.error === "closed" ? "closed" : "failed")}
        </p>
      ) : null}
    </form>
  );
}
