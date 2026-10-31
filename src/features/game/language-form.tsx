import { getLocale, getTranslations } from "next-intl/server";
import { Field, SelectInput } from "@/components/form-ui";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/i18n/locale";
import { setLocaleAction } from "./set-locale-action";

/**
 * Language selection: the full-screen radio list (frame 52, default) or, with
 * `variant="select"`, the compact dropdown of the account settings (dyqXx).
 */
export async function LanguageForm({
  variant = "page",
}: {
  variant?: "page" | "select";
}) {
  const [current, t] = await Promise.all([
    getLocale(),
    getTranslations("language"),
  ]);
  const active = isLocale(current) ? current : "en";

  if (variant === "select") {
    return (
      <form action={setLocaleAction} className="flex flex-col gap-3">
        <Field label={t("label")}>
          <SelectInput name="locale" defaultValue={active}>
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_NAMES[locale]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <button
          type="submit"
          className="bg-santa-green text-santa-white h-14 rounded-full px-6 text-base font-semibold"
        >
          {t("save")}
        </button>
      </form>
    );
  }

  return (
    <form action={setLocaleAction} className="flex flex-col gap-5">
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("title")}
      </h1>
      <p className="text-santa-muted text-sm leading-relaxed">{t("hint")}</p>
      <fieldset className="flex flex-col">
        <legend className="sr-only">{t("label")}</legend>
        {LOCALES.map((locale) => (
          <label
            key={locale}
            className="border-santa-line text-santa-ink flex cursor-pointer items-center gap-3 border-b py-4 text-base has-[:checked]:font-semibold"
          >
            <input
              type="radio"
              name="locale"
              value={locale}
              defaultChecked={locale === active}
              className="border-santa-green accent-santa-green size-5"
            />
            {LOCALE_NAMES[locale]}
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        className="bg-santa-green text-santa-white h-14 rounded-full px-6 text-base font-semibold"
      >
        {t("save")}
      </button>
    </form>
  );
}
