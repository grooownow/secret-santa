import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";

/** Frame m0fBq: the account's email is not confirmed yet. */
export async function UnverifiedNotice({ email }: { email: string }) {
  const t = await getTranslations("profile.unverified");
  return (
    <div className="flex flex-col gap-5">
      <PageTitle>{t("title")}</PageTitle>
      <div className="bg-santa-yellow text-santa-ink flex flex-col gap-1 rounded-2xl p-4">
        <p className="text-base font-bold">{t("boxTitle")}</p>
        <p className="text-sm leading-relaxed">{t("boxText", { email })}</p>
      </div>
      <LinkButton href="/check-email">{t("action")}</LinkButton>
      <PageText>{t("hint")}</PageText>
    </div>
  );
}
