import { getTranslations } from "next-intl/server";
import { SiteFooterView } from "@/components/site-footer-view";

/**
 * Rules link and developer line. Used on public pages and in the admin area,
 * never in the participant cabinet.
 */
export async function SiteFooter({
  organizer,
}: {
  organizer?: React.ReactNode;
} = {}) {
  const t = await getTranslations("footer");
  return (
    <SiteFooterView
      organizer={organizer}
      labels={{
        rules: t("rules"),
        madeBy: t("madeBy"),
        threads: t("threads"),
      }}
    />
  );
}
