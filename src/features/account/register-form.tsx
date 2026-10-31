"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { ConsentFields } from "./consent-fields";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextInput,
  TextLink,
} from "@/components/form-ui";
import { registerAction, type RegisterState } from "./register-action";

const initial: RegisterState = {};

export function RegisterForm({ defaultLocale }: { defaultLocale: string }) {
  const t = useTranslations("account.register");
  const [state, formAction] = useActionState(registerAction, initial);
  const invalid =
    state.error === "consent" || state.error === "age"
      ? state.error
      : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label={t("email")}
        error={state.error === "email" ? t("errors.email") : undefined}
      >
        <TextInput
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          defaultValue={state.email ?? ""}
          required
        />
      </Field>
      <Field
        label={t("password")}
        hint={t("passwordHint")}
        error={state.error === "password" ? t("errors.password") : undefined}
      >
        <TextInput
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
      </Field>
      <ConsentFields
        defaultLocale={state.locale ?? defaultLocale}
        invalid={invalid}
      />
      {state.error && state.error !== "email" && state.error !== "password" ? (
        <FormAlert>{t(`errors.${state.error}`)}</FormAlert>
      ) : null}
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
      <p className="text-santa-muted text-[13px]">
        {t("haveAccount")} <TextLink href="/signin">{t("signIn")}</TextLink>
      </p>
    </form>
  );
}
