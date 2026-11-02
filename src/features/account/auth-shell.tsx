import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/features/game";
import { PageMain } from "@/components/page-main";
import { cn } from "@/lib/utils";

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
          <Link href="/" className="text-santa-ink text-[13px] lg:text-[15px]">
            {h("home")}
          </Link>
        }
      />
      <PageMain>
        {icon ? (
          <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
            {icon}
          </div>
        ) : null}
        {children}
      </PageMain>
    </div>
  );
}

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-santa-ink text-[26px] leading-tight font-bold lg:text-[40px]",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function PageText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-santa-muted text-sm leading-relaxed lg:text-base",
        className,
      )}
    >
      {children}
    </p>
  );
}
