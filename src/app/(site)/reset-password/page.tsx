import { Clock, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import {
  AuthShell,
  PageText,
  PageTitle,
  ResetForm,
  tokenIsValid,
} from "@/features/account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.reset");
  return { title: t("title") };
}

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [t, { token }] = await Promise.all([
    getTranslations("account.reset"),
    searchParams,
  ]);
  const valid =
    typeof token === "string" && (await tokenIsValid(token, "reset"));

  if (!valid) {
    return (
      <AuthShell icon={<Clock aria-hidden />}>
        <PageTitle>{t("expiredTitle")}</PageTitle>
        <PageText>{t("expiredText")}</PageText>
        <LinkButton href="/forgot-password">{t("expiredCta")}</LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell icon={<LockKeyhole aria-hidden />}>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <ResetForm token={token} />
    </AuthShell>
  );
}
