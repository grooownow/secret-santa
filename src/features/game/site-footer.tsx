import { getTranslations } from "next-intl/server";
import { SiteFooterView } from "@/components/site-footer-view";

/**
 * Rules link and developer line. Used on public pages and in the admin area,
 * never in the participant cabinet.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <SiteFooterView
      labels={{
        rules: t("rules"),
        madeBy: t("madeBy"),
        threads: t("threads"),
      }}
    />
  );
}
