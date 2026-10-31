import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AuthShell, PageText, PageTitle } from "./auth-shell";
import { AuthMethodsWithGoogle } from "./google-button";
import { HOME } from "./routes";
import { RegisterForm } from "./register-form";

export async function RegisterPage() {
  const [t, locale, session] = await Promise.all([
    getTranslations("account.register"),
    getLocale(),
    getSessionUser(),
  ]);
  if (session) redirect(HOME);

  return (
    <AuthShell>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <AuthMethodsWithGoogle>
        <RegisterForm defaultLocale={locale} />
      </AuthMethodsWithGoogle>
    </AuthShell>
  );
}
