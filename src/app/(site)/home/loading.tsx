import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/page-loading";

// Instant feedback on navigation: the layout stays, the content shows a
// placeholder until the server-rendered page streams in.
export default async function Loading() {
  const t = await getTranslations("app");
  return <PageLoading label={t("loading")} />;
}
