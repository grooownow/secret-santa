import { getTranslations } from "next-intl/server";
import { TextLink } from "@/components/form-ui";
import { guessPath } from "@/lib/cabinet-routes";

/**
 * «А кто твой Санта?» on «Профиль»: closed before the gifts start (says from
 * when), then a link to guess, or the saved guess with «Изменить догадку».
 */
export async function GuessBlock({
  personId,
  open,
  guessedName,
  dates,
}: {
  personId: string;
  open: boolean;
  guessedName: string | null;
  /** Formatted days: when guessing opens and until when it is possible. */
  dates: { giftsStart: string; giftsEnd: string };
}) {
  const t = await getTranslations("cabinet.home");
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-santa-ink text-base font-bold">{t("guessTitle")}</h2>
      <p className="text-santa-muted text-sm leading-relaxed">
        {!open
          ? t("guessLater", { date: dates.giftsStart })
          : guessedName
            ? t("guessSaved", { name: guessedName })
            : t("guessText", { date: dates.giftsEnd })}
      </p>
      {open ? (
        <TextLink href={guessPath(personId)}>
          {guessedName
            ? t("guessChange")
            : t("guessLinkUntil", { date: dates.giftsEnd })}
        </TextLink>
      ) : null}
    </section>
  );
}
