"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  acceptConsentAction,
  type ConsentState,
} from "./accept-consent-action";
import { ConsentFields } from "./consent-fields";
import { FormAlert, SubmitButton } from "@/components/form-ui";

const initial: ConsentState = {};

export function WelcomeForm({ defaultLocale }: { defaultLocale: string }) {
  const t = useTranslations("account.welcome");
  const [state, formAction] = useActionState(acceptConsentAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ConsentFields
        defaultLocale={defaultLocale}
        invalid={
          state.error === "age"
            ? "age"
            : state.error === "consent"
              ? "consent"
              : undefined
        }
      />
      {state.error ? <FormAlert>{t(`errors.${state.error}`)}</FormAlert> : null}
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
    </form>
  );
}
