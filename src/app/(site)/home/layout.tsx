import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/features/account";
import { requireAccount } from "@/features/auth";
import { SiteHeader } from "@/features/game";
import { CabinetNav } from "@/features/profile";

// The participant cabinet: header, content, bottom menu. No developer footer
// here (it lives on public pages, in the admin and in the settings block).
export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccount();
  const t = await getTranslations("profile.nav");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        action={
          <form action={signOutAction}>
            <button type="submit" className="text-santa-ink text-[13px]">
              {t("signOut")}
            </button>
          </form>
        }
      />
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-8">
        {children}
      </main>
      <CabinetNav />
    </div>
  );
}
