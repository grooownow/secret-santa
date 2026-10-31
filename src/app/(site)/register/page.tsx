import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterPage } from "@/features/account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.register");
  return { title: t("title") };
}

export default function Register() {
  return <RegisterPage />;
}
