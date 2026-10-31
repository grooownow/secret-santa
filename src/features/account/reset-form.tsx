"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextInput,
} from "@/components/form-ui";
import { resetPasswordAction, type ResetState } from "./reset-password-action";

const initial: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("account.reset");
  const [state, formAction] = useActionState(resetPasswordAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label={t("password")} hint={t("passwordHint")}>
        <TextInput
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
      </Field>
      <Field label={t("confirm")}>
        <TextInput
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
    </form>
  );
}
