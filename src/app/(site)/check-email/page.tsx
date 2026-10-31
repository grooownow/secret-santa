import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { TextLink } from "@/components/form-ui";
import {
  AuthShell,
  HOME,
  PageText,
  PageTitle,
  ResendForm,
} from "@/features/account";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.checkEmail");
  return { title: t("title") };
}

export default async function CheckEmail({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const [t, params, session] = await Promise.all([
    getTranslations("account.checkEmail"),
    searchParams,
    auth(),
  ]);

  // A signed-in account that is already verified has nothing to wait for.
  if (session?.user?.id) {
    const [row] = await getDb()
      .select({ emailVerified: users.emailVerified, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (row?.emailVerified) redirect(HOME);
  }

  const fromQuery = z.email().safeParse(params.email);
  const email = fromQuery.success
    ? fromQuery.data
    : (session?.user?.email ?? undefined);

  return (
    <AuthShell icon={<Mail aria-hidden />}>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{email ? t("text", { email }) : t("textNoEmail")}</PageText>
      <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
        <p className="text-santa-ink text-base font-bold">{t("noMailTitle")}</p>
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("noMailText")}
        </p>
      </div>
      <ResendForm email={email} startLocked={!!fromQuery.success} />
      {email ? null : <TextLink href="/signin">{t("toSignIn")}</TextLink>}
    </AuthShell>
  );
}
