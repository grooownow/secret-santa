import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsView } from "@/features/account";
import { requireAccount } from "@/features/auth";
import { getPhase, getSettings } from "@/features/game";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

// Account settings (frame dyqXx).
export default async function SettingsPage() {
  const [account, settings] = await Promise.all([
    requireAccount(),
    getSettings(),
  ]);
  return (
    <SettingsView
      email={account.email}
      canDelete={getPhase(new Date(), settings) === "collect"}
    />
  );
}
