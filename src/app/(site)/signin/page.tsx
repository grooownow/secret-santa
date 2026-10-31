import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignInPage } from "@/features/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.signIn");
  return { title: t("title") };
}

interface SignInProps {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
}

export default async function SignIn({ searchParams }: SignInProps) {
  const { callbackUrl, error } = await searchParams;
  return <SignInPage callbackUrl={callbackUrl} error={error} />;
}
