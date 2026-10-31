import { CircleCheck, Clock, MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LinkButton, SubmitButton, TextLink } from "@/components/form-ui";
import {
  AuthShell,
  confirmEmailAction,
  PageText,
  PageTitle,
  ResendForm,
  tokenIsValid,
} from "@/features/account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.verified");
  return { title: t("title") };
}

/**
 * Opening the link only shows a "Confirm my email" button; the token is
 * spent by `confirmEmailAction` on the POST. Mail scanners that prefetch the
 * link therefore cannot use it up.
 */
export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    confirmed?: string | string[];
  }>;
}) {
  const [t, c, e, { token, confirmed }] = await Promise.all([
    getTranslations("account.verified"),
    getTranslations("account.verifyConfirm"),
    getTranslations("account.verifyExpired"),
    searchParams,
  ]);

  if (confirmed === "1") {
    return (
      <AuthShell icon={<CircleCheck aria-hidden />}>
        <PageTitle>{t("title")}</PageTitle>
        <PageText>{t("text")}</PageText>
        <LinkButton href="/signin">{t("signIn")}</LinkButton>
      </AuthShell>
    );
  }

  if (typeof token === "string" && (await tokenIsValid(token, "verify"))) {
    return (
      <AuthShell icon={<MailCheck aria-hidden />}>
        <PageTitle>{c("title")}</PageTitle>
        <PageText>{c("text")}</PageText>
        <form action={confirmEmailAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel={c("pending")}>{c("submit")}</SubmitButton>
        </form>
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
      <p className="text-santa-muted text-[13px]">
        {e("passwordHint")}{" "}
        <TextLink href="/forgot-password">{e("newPassword")}</TextLink>
      </p>
    </AuthShell>
  );
}
