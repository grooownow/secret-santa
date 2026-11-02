"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextAreaInput,
} from "@/components/form-ui";
import { ListboxSelect } from "@/components/listbox-select";
import { markGiftFormAction } from "./mark-gift-action";
import { NOTE_MAX } from "./schemas";
import type { GiftState } from "./state";

const initial: GiftState = {};

/**
 * "Оставить подарок" (frames b4x7S, OGFSm): the place and an optional
 * anonymous note. Saving is final, so the submit first asks «Всё верно?»;
 * only «Да, сохранить» sends the form. After a save the page shows the
 * read-only `GiftLeftView` instead of this form.
 */
export function GiftForm({
  participantId,
  name,
}: {
  participantId: string;
  name: string;
}) {
  const t = useTranslations("gift.form");
  const [state, formAction] = useActionState(markGiftFormAction, initial);
  const values = state.values ?? { place: "", note: "" };
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const placeRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState(values.place ?? "");
  const [placeMissing, setPlaceMissing] = useState(false);
  const [asking, setAsking] = useState(false);

  return (
    <form
      ref={formRef}
      action={formAction}
      // The place is our own listbox (no native `required`), so it is checked
      // here; only a complete form gets the «Всё верно?» question.
      onSubmit={(event) => {
        if (confirmed.current) {
          confirmed.current = false;
          return;
        }
        event.preventDefault();
        if (!place) {
          setPlaceMissing(true);
          placeRef.current?.focus();
          return;
        }
        setAsking(true);
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="participantId" value={participantId} />
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("title")}
      </h1>
      <p className="text-santa-muted text-sm leading-relaxed">
        {t("intro", { name })}
      </p>

      <Field
        label={t("place")}
        error={placeMissing ? t("placeMissing") : undefined}
      >
        <ListboxSelect
          ref={placeRef}
          name="place"
          placeholder={t("placePlaceholder")}
          defaultValue={place}
          onValueChange={(next) => {
            setPlace(next);
            setPlaceMissing(false);
          }}
          options={[
            { value: "locker", label: t("locker") },
            { value: "mailbox", label: t("mailbox") },
          ]}
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

      <SubmitButton
        pendingLabel={t("pending")}
        icon={<Gift className="size-[18px]" aria-hidden />}
      >
        {t("submit")}
      </SubmitButton>
      <p className="text-santa-muted text-xs leading-relaxed">{t("hint")}</p>

      <ConfirmDialog
        open={asking}
        title={t("confirmTitle")}
        text={t("confirmText")}
        confirmLabel={t("confirmYes")}
        cancelLabel={t("confirmBack")}
        closeLabel={t("close")}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          confirmed.current = true;
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
