import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/features/account";
import { AdminNav } from "@/features/admin";
import { requireOrganizer } from "@/features/auth";
import { SiteHeader } from "@/features/game";
import { CabinetNav } from "@/features/profile";
import { PageMain } from "@/components/page-main";
import { PendingSpinner } from "@/components/spinner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title") };
}

// The organizer's area: header, section tabs, content.
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
      <div className="print:hidden">
        <SiteHeader
          nav={<CabinetNav variant="header" organizer />}
          action={
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-santa-ink flex items-center gap-1.5 text-[13px] lg:text-[15px]"
              >
                {t("signOut")}
                <PendingSpinner className="size-3.5" />
              </button>
            </form>
          }
        />
      </div>
      <PageMain>
        {/* Section name, not a control: plain text, so it is not mistaken
            for a button. Each page keeps its own <h1> below the tabs. */}
        <p className="font-heading text-santa-ink text-xl font-bold print:hidden">
          {t("title")}
        </p>
        <div className="print:hidden">
          <AdminNav />
        </div>
        {children}
      </PageMain>
      {/* The cabinet's bottom bar with «Админка» active: the way back to the
          participant side. Not printed with the QR sheet. */}
      <div className="sticky bottom-0 print:hidden">
        <CabinetNav organizer />
      </div>
    </div>
  );
}
