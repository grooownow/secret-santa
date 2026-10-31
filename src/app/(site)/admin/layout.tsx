import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/features/account";
import { AdminNav } from "@/features/admin";
import { requireOrganizer } from "@/features/auth";
import { SiteFooter, SiteHeader } from "@/features/game";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title") };
}

// The organizer's area: header, section tabs, content, developer footer.
// Anyone but the organizer gets a 404 from the guard.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOrganizer();
  const t = await getTranslations("admin");
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
        <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-[7px] text-[11px] font-semibold">
          {t("title")}
        </span>
        <AdminNav />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
