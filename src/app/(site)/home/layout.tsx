import { isOrganizer, requireAccount } from "@/features/auth";
import { ShareGame, SiteHeader } from "@/features/game";
import { CabinetNav } from "@/features/profile";
import { PageMain } from "@/components/page-main";

// The participant cabinet: header with the menu on desktop, content, the
// bottom menu on a phone. No developer footer here (the author block lives on the landing and in Settings). Signing out
// is in Settings only; the header action is «Поделиться игрой» (cabinet only,
// public pages keep their sign-in / cabinet link there).
export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await requireAccount();
  const organizer = isOrganizer(account);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        action={<ShareGame />}
        nav={<CabinetNav variant="header" organizer={organizer} />}
      />
      <PageMain>{children}</PageMain>
      <CabinetNav organizer={organizer} />
    </div>
  );
}
