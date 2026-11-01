"use client";

import { useTranslations } from "next-intl";
import { LOCALES, LOCALE_NAMES } from "@/i18n/locale";
import {
  CheckboxRow,
  Field,
  SelectInput,
  TextLink,
} from "@/components/form-ui";

/**
 * Consent and 14+ checkboxes, shared by register and /welcome. Register also
 * shows the language select (pass `defaultLocale`); /welcome stores the
 * language the page is already shown in, so it passes none.
 */
export function ConsentFields({
  defaultLocale,
  invalid,
}: {
  defaultLocale?: string;
  invalid?: "consent" | "age";
}) {
  const t = useTranslations("account.consent");
  return (
    <>
      {defaultLocale ? (
        <Field label={t("language")}>
          <SelectInput name="locale" defaultValue={defaultLocale}>
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_NAMES[locale]}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : null}
      <div className="flex flex-col gap-4">
        <CheckboxRow name="consent" invalid={invalid === "consent"}>
          {t("consent")}
        </CheckboxRow>
        <CheckboxRow name="age14" invalid={invalid === "age"}>
          {t("age")}
        </CheckboxRow>
        <p className="text-santa-muted text-xs">{t("processors")}</p>
        <TextLink href="/rules">{t("rules")}</TextLink>
      </div>
    </>
  );
}
