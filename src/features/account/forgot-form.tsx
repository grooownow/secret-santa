"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  type ForgotState,
} from "./forgot-password-action";
import {
  Field,
  FormAlert,
  LinkButton,
  SubmitButton,
  TextInput,
  TextLink,
} from "@/components/form-ui";

const initial: ForgotState = {};

export function ForgotForm() {
  const t = useTranslations("account.forgot");
  const [state, formAction] = useActionState(forgotPasswordAction, initial);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
          <Mail aria-hidden />
        </div>
        <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
          {t("sentTitle")}
        </h1>
        <output className="text-santa-muted block text-sm leading-relaxed">
          {t("sentText")}
        </output>
        <LinkButton href="/signin">{t("backToSignIn")}</LinkButton>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("email")}>
        <TextInput
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          defaultValue={state.email ?? ""}
          required
        />
      </Field>
      {state.status === "invalid" ? (
        <FormAlert>{t("invalid")}</FormAlert>
      ) : null}
      {state.status === "rate" ? <FormAlert>{t("rate")}</FormAlert> : null}
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
      <TextLink href="/signin">{t("back")}</TextLink>
    </form>
  );
}
