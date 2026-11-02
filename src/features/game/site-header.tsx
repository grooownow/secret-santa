import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./language-switcher";

/**
 * Page header (component rDT8Q): game name, the cabinet menu on desktop,
 * language picker, one action.
 */
export async function SiteHeader({
  action,
  nav,
}: {
  action?: React.ReactNode;
  /** Cabinet menu beside the name; shows itself from `lg`. */
  nav?: React.ReactNode;
}) {
  const t = await getTranslations("app");

  return (
    <header className="bg-santa-mint">
      <div className="lg:santa-page flex items-center justify-between px-6 py-5 lg:h-20 lg:gap-6 lg:py-0">
        <div className="flex min-w-0 items-center lg:gap-8 xl:gap-12">
          <Link
            href="/"
            className="text-santa-ink shrink-0 text-base font-bold lg:text-xl"
          >
            <span className="font-heading">{t("name")}</span>
          </Link>
          {nav}
        </div>
        <div className="flex shrink-0 items-center gap-[18px] lg:gap-7">
          <LanguageSwitcher />
          {action}
        </div>
      </div>
    </header>
  );
}
