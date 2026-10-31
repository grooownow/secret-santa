import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader } from "@/features/game";

// Placeholder: the real landing page is built in a later task.
export default async function HomePage() {
  const [t, h] = await Promise.all([
    getTranslations("home"),
    getTranslations("header"),
  ]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        action={
          <Link href="/signin" className="text-santa-ink text-[13px]">
            {h("signIn")}
          </Link>
        }
      />
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-7">
        <h1 className="text-[26px] leading-tight font-bold">{t("title")}</h1>
        <p className="text-santa-muted text-sm leading-relaxed">{t("text")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
