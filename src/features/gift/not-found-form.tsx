"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/form-ui";
import { reportNotFoundFormAction } from "./not-found-action";
import type { GiftState } from "./state";
import { Spinner } from "@/components/spinner";

const initial: GiftState = {};

/** «Не нашёл подарок»: secondary pill that tells the organizer. */
export function NotFoundForm({ participantId }: { participantId: string }) {
  const t = useTranslations("gift.mine");
  const [state, formAction, pending] = useActionState(
    reportNotFoundFormAction,
    initial,
  );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="participantId" value={participantId} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="border-santa-green text-santa-green bg-santa-white flex h-14 w-full items-center justify-center gap-2 rounded-full border px-6 text-base font-semibold disabled:opacity-60"
      >
        {t("notFoundButton")}
        {pending ? <Spinner /> : null}
      </button>
      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}
      {state.saved ? (
        <output className="text-santa-green text-sm font-semibold">
          {t("notFound.title")}
        </output>
      ) : null}
    </form>
  );
}
