import { isOrganizer, requireAccount } from "@/features/auth";
import { ShareGame, SiteHeader } from "@/features/game";
import { CabinetNav } from "@/features/profile";
import { PageMain } from "@/components/page-main";

// The participant cabinet: header, menu, content. The menu comes before the
// content in the DOM (tabs on desktop) and is moved to the bottom on a phone.
// No developer footer
// here (the author block lives on the landing and in Settings). Signing out
// is in Settings only; the header action is «Поделиться игрой» (cabinet only,
// public pages keep their sign-in / cabinet link there).
export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await requireAccount();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader action={<ShareGame />} />
      <div className="sticky bottom-0 max-lg:order-last lg:static">
        <CabinetNav organizer={isOrganizer(account)} />
      </div>
      <PageMain>{children}</PageMain>
    </div>
  );
}
