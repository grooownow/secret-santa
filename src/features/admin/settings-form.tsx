"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextInput,
} from "@/components/form-ui";
import { DATE_FIELDS } from "./dates-schema";
import { updateSettings, type SettingsState } from "./update-settings-action";

const initial: SettingsState = {};

/** Game dates (frame wESwL). The draw date does not start the draw. */
export function SettingsForm({ values }: { values: Record<string, string> }) {
  const t = useTranslations("admin.settings");
  const [state, formAction] = useActionState(updateSettings, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-santa-muted text-sm leading-relaxed">{t("zone")}</p>
      {DATE_FIELDS.map((name) => (
        <Field key={name} label={t(`fields.${name}`)}>
          <TextInput
            type="date"
            name={name}
            required
            defaultValue={values[name]}
          />
        </Field>
      ))}
      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}
      {state.saved ? (
        <output className="text-santa-green text-sm font-semibold">
          {t("saved")}
        </output>
      ) : null}
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
      <p className="text-santa-muted text-xs leading-relaxed">
        {t("drawNote")}
      </p>
    </form>
  );
}
