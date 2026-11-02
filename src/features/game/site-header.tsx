import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./language-switcher";

/** Page header (component rDT8Q): game name, language picker, one action. */
export async function SiteHeader({ action }: { action?: React.ReactNode }) {
  const t = await getTranslations("app");

  return (
    <header className="bg-santa-mint">
      <div className="lg:santa-page flex items-center justify-between px-6 py-5 lg:py-7">
        <Link
          href="/"
          className="text-santa-ink text-base font-bold lg:text-xl"
        >
          <span className="font-heading">{t("name")}</span>
        </Link>
        <div className="flex items-center gap-[18px] lg:gap-7">
          <LanguageSwitcher />
          {action}
        </div>
      </div>
    </header>
  );
}
