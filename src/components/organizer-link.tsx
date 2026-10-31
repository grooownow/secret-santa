import { getTranslations } from "next-intl/server";
import { ORGANIZER_TELEGRAM } from "@/lib/organizer";

/** "Write to Kate on Telegram": external link in a new tab. */
export async function OrganizerLink() {
  const t = await getTranslations("organizer");
  return (
    <a
      href={ORGANIZER_TELEGRAM}
      target="_blank"
      rel="noopener noreferrer"
      className="text-santa-green text-[13px] font-semibold underline-offset-4 hover:underline"
    >
      {t("write")}
    </a>
  );
}
