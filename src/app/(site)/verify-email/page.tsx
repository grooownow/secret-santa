import { CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import {
  AuthShell,
  PageText,
  PageTitle,
  ResendForm,
  verifyEmailToken,
} from "@/features/account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.verified");
  return { title: t("title") };
}

export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [t, e, { token }] = await Promise.all([
    getTranslations("account.verified"),
    getTranslations("account.verifyExpired"),
    searchParams,
  ]);
  const ok = typeof token === "string" && (await verifyEmailToken(token));

  if (ok) {
    return (
      <AuthShell icon={<CircleCheck aria-hidden />}>
        <PageTitle>{t("title")}</PageTitle>
        <PageText>{t("text")}</PageText>
        <LinkButton href="/signin">{t("signIn")}</LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell icon={<Clock aria-hidden />}>
      <PageTitle>{e("title")}</PageTitle>
      <PageText>{e("text")}</PageText>
      <ResendForm submitLabel={e("submit")} />
      <p className="text-santa-muted text-[13px]">
        {e("verified")} <TextLink href="/signin">{e("signIn")}</TextLink>
      </p>
    </AuthShell>
  );
}
