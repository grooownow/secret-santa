"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { deleteParticipantAction } from "./delete-participant-action";
import type { ProfileState } from "./state";
import { PendingSpinner } from "@/components/spinner";

const initial: ProfileState = {};

/** "Delete profile" link-style button; the owner's one also removes children. */
export function DeleteParticipantForm({
  id,
  withChildren,
}: {
  id: string;
  withChildren?: boolean;
}) {
  const t = useTranslations("profile.delete");
  const e = useTranslations("profile.errors");
  const [state, formAction] = useActionState(deleteParticipantAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-santa-danger flex items-center gap-1.5 self-start text-[13px] font-semibold underline-offset-4 hover:underline"
        onClick={(event) => {
          if (
            !window.confirm(withChildren ? t("confirmOwner") : t("confirm"))
          ) {
            event.preventDefault();
          }
        }}
      >
        {t("action")}
        <PendingSpinner className="size-3.5" />
      </button>
      {state.error ? (
        <p role="alert" className="text-santa-danger text-sm">
          {e(state.error)}
        </p>
      ) : null}
    </form>
  );
}
