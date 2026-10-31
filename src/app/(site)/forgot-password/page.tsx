import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell, ForgotForm, PageText, PageTitle } from "@/features/account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.forgot");
  return { title: t("title") };
}

export default async function ForgotPassword() {
  const t = await getTranslations("account.forgot");
  // The form swaps itself for the "check your email" view after sending.
  return (
    <AuthShell icon={<KeyRound aria-hidden />}>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <ForgotForm />
    </AuthShell>
  );
}
