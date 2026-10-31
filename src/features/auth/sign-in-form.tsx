"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  Field,
  FormAlert,
  SubmitButton,
  TextInput,
  TextLink,
} from "@/components/form-ui";
import { signInFormAction, type SignInFormState } from "./sign-in-action";

const initialState: SignInFormState = {};

/**
 * Client credentials form. A failed sign-in shows the generic error box
 * (frame fCfVC) and keeps the typed email. `redirectTo` is a hidden field,
 * re-validated server-side. Not optimistic (frontend.md rule 3): a sign-in
 * cannot be shown as done before the server confirms it, so the button only
 * shows a pending state.
 */
export function SignInForm({
  redirectTo,
  notice,
}: {
  redirectTo?: string;
  notice?: "denied" | "failed";
}) {
  const t = useTranslations("account.signIn");
  const [state, formAction] = useActionState(signInFormAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}
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
      <Field label={t("password")}>
        <TextInput
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {state.error ? (
        <FormAlert title={t("errorTitle")}>
          {state.error === "invalid_input" ? t("invalidInput") : t("errorText")}
        </FormAlert>
      ) : notice ? (
        <FormAlert title={t("errorTitle")}>{t(`notice.${notice}`)}</FormAlert>
      ) : null}
      <TextLink href="/forgot-password">{t("forgot")}</TextLink>
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
      <p className="text-santa-muted text-[13px]">
        {t("noAccount")} <TextLink href="/register">{t("join")}</TextLink>
      </p>
    </form>
  );
}
