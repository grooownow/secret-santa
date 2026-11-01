import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  AuthShell,
  HOME,
  PageText,
  PageTitle,
  WelcomeForm,
} from "@/features/account";
import { requireAccount } from "@/features/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.welcome");
  return { title: t("title") };
}

// Shown once after the first Google sign-in. It must not call
// requireAccount() without the option, or it would redirect to itself.
export default async function Welcome() {
  const account = await requireAccount({ allowWithoutConsent: true });
  if (account.consentAt) redirect(HOME);

  const t = await getTranslations("account.welcome");
  return (
    <AuthShell>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <WelcomeForm />
    </AuthShell>
  );
}
