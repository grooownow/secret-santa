"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  Field,
  FormAlert,
  SelectInput,
  SubmitButton,
  TextAreaInput,
  TextInput,
} from "@/components/form-ui";
import { markGiftFormAction } from "./mark-gift-action";
import { CODE_MAX, NOTE_MAX } from "./schemas";
import type { GiftState } from "./state";

const initial: GiftState = {};

export interface GiftDefaults {
  place: "locker" | "mailbox" | "";
  code: string;
  note: string;
}

/**
 * "Оставить подарок" (frames b4x7S, OGFSm, Y5rWl): place, number or code and an
 * optional anonymous note. `marked` switches to the edit variant; saving again
 * emails the receiver the new details.
 */
export function GiftForm({
  participantId,
  defaults,
  marked,
  name,
}: {
  participantId: string;
  defaults: GiftDefaults;
  marked: boolean;
  name: string;
}) {
  const t = useTranslations("gift.form");
  const [state, formAction] = useActionState(markGiftFormAction, initial);
  const values = state.values ?? defaults;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="participantId" value={participantId} />
      {marked || state.saved ? (
        <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
          <CircleCheck className="size-6" aria-hidden />
        </div>
      ) : null}
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {marked || state.saved ? t("titleDone") : t("title")}
      </h1>
      <p className="text-santa-muted text-sm leading-relaxed">
        {marked || state.saved ? t("introDone") : t("intro", { name })}
      </p>

      <Field label={t("place")}>
        <SelectInput name="place" required defaultValue={values.place ?? ""}>
          <option value="" disabled>
            {t("placePlaceholder")}
          </option>
          <option value="locker">{t("locker")}</option>
          <option value="mailbox">{t("mailbox")}</option>
        </SelectInput>
      </Field>
      <Field label={t("code")}>
        <TextInput
          name="code"
          maxLength={CODE_MAX}
          defaultValue={values.code ?? ""}
          placeholder={t("codePlaceholder")}
        />
      </Field>
      <Field label={t("note")} hint={t("noteHint", { max: NOTE_MAX })}>
        <TextAreaInput
          name="note"
          maxLength={NOTE_MAX}
          defaultValue={values.note ?? ""}
          placeholder={t("notePlaceholder")}
        />
      </Field>

      <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
        <p className="text-santa-green text-base font-bold">{t("boxTitle")}</p>
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("boxText")}
        </p>
      </div>

      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}
      {state.saved ? (
        <output className="text-santa-green block text-sm font-semibold">
          {t("saved")}
        </output>
      ) : null}

      <SubmitButton pendingLabel={t("pending")}>
        {marked || state.saved ? t("saveChanges") : t("submit")}
      </SubmitButton>
      <p className="text-santa-muted text-xs leading-relaxed">{t("hint")}</p>
    </form>
  );
}
