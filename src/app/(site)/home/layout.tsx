import { isOrganizer, requireAccount } from "@/features/auth";
import { ShareGame, SiteHeader } from "@/features/game";
import { CabinetNav } from "@/features/profile";

// The participant cabinet: header, content, bottom menu. No developer footer
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
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-8">
        {children}
      </main>
      <CabinetNav organizer={isOrganizer(account)} />
    </div>
  );
}
