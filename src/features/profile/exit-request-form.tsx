"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextAreaInput,
} from "@/components/form-ui";
import {
  requestExitAction,
  type ExitRequestState,
} from "./exit-request-action";
import { EXIT_COMMENT_MAX } from "./schemas";

const initial: ExitRequestState = {};

export interface ExitCandidate {
  id: string;
  name: string;
  kind: "adult" | "child";
  /** Already asked: when (formatted), so the page can say so. */
  requested: boolean;
}

/**
 * «Не могу участвовать» after the draw: who cannot play (when the account has
 * several participants; the adult takes the family along) and an optional
 * comment for the organizer, who gets an email and confirms in the admin.
 */
export function ExitRequestForm({ people }: { people: ExitCandidate[] }) {
  const t = useTranslations("settings.exit");
  const [state, formAction] = useActionState(requestExitAction, initial);
  const open = people.filter((p) => !p.requested);
  if (state.saved) {
    return (
      <output className="bg-santa-mint text-santa-green block rounded-2xl p-4 text-sm font-semibold">
        {t("sent")}
      </output>
    );
  }
  if (open.length === 0) return null;
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {open.length === 1 ? (
        <input type="hidden" name="participantId" value={open[0]!.id} />
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-santa-green mb-2 text-xs font-semibold">
            {t("who")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {open.map((p, i) => (
              <label
                key={p.id}
                className="border-santa-line text-santa-ink has-checked:border-santa-green has-checked:bg-santa-mint has-checked:text-santa-green has-focus-visible:outline-santa-green flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
              >
                <input
                  type="radio"
                  name="participantId"
                  value={p.id}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {p.kind === "adult" ? t("whoAdult", { name: p.name }) : p.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Field
        label={t("comment")}
        hint={t("commentHint", { max: EXIT_COMMENT_MAX })}
      >
        <TextAreaInput
          name="comment"
          maxLength={EXIT_COMMENT_MAX}
          defaultValue={state.comment ?? ""}
          placeholder={t("commentPlaceholder")}
        />
      </Field>
      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
    </form>
  );
}
