import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/features/game";

/**
 * Frame of every account page: header and a narrow column (no footer: it is
 * on the landing and in Settings only). The
 * badge is the round icon from the mockups (omitted on the form pages).
 */
export async function AuthShell({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const h = await getTranslations("header");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        action={
          <Link href="/" className="text-santa-ink text-[13px]">
            {h("home")}
          </Link>
        }
      />
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-8">
        {icon ? (
          <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
            {icon}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
      {children}
    </h1>
  );
}

export function PageText({ children }: { children: React.ReactNode }) {
  return <p className="text-santa-muted text-sm leading-relaxed">{children}</p>;
}
