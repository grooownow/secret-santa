import { getTranslations } from "next-intl/server";
import { SiteFooterView } from "@/components/site-footer-view";

/**
 * The author footer with its translation. Shown on the landing and in the
 * cabinet Settings only; no other page has a footer.
 */
export async function SiteFooter({ className }: { className?: string } = {}) {
  const t = await getTranslations("footer");
  return (
    <SiteFooterView className={className} labels={{ title: t("title") }} />
  );
}
