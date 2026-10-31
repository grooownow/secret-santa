import { Heart, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import { CABINET_WALL, myGiftPath } from "@/lib/cabinet-routes";
import type { RevealResult } from "./queries";

function Box({
  tone,
  title,
  text,
}: {
  tone: "mint" | "yellow";
  title: string;
  text: string;
}) {
  return (
    <div
      className={`${tone === "yellow" ? "bg-santa-yellow text-santa-ink" : "bg-santa-mint text-santa-green"} flex flex-col gap-1 rounded-2xl p-4`}
    >
      <p className="text-base font-bold">{title}</p>
      <p
        className={`${tone === "yellow" ? "" : "text-santa-muted"}text-sm leading-relaxed`}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * The reveal (frames N23iS and UIhvH): the Santa's name and the result of the
 * guess, or "Запасной Санта" without a name. A wrong guess is told warmly, a
 * missing guess is not mentioned at all.
 */
export async function RevealCard({
  personId,
  reveal,
}: {
  personId: string;
  reveal: Extract<RevealResult, { state: "ready" }>;
}) {
  const t = await getTranslations("reveal.card");
  const { santa } = reveal;
  const backup = santa === "backup";

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        {backup ? (
          <Heart className="size-6" aria-hidden />
        ) : (
          <Sparkles className="size-6" aria-hidden />
        )}
      </div>
      <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
        {t("chip")}
      </span>

      {backup ? (
        <>
          <PageTitle>{t("backupTitle")}</PageTitle>
          <PageText>{t("backupText")}</PageText>
          <Box
            tone="mint"
            title={t("backupBoxTitle")}
            text={t("backupBoxText")}
          />
        </>
      ) : (
        <>
          <PageTitle>{t("title", { name: santa.name })}</PageTitle>
          <PageText>{t("text", { building: santa.building ?? "" })}</PageText>
          {reveal.guessCorrect === true ? (
            <Box
              tone="yellow"
              title={t("rightTitle")}
              text={t("rightText", { name: santa.name })}
            />
          ) : null}
          {reveal.guessCorrect === false && reveal.guessedName ? (
            <Box
              tone="yellow"
              title={t("wrongTitle")}
              text={t("wrongText", {
                guess: reveal.guessedName,
                santa: santa.name,
              })}
            />
          ) : null}
        </>
      )}

      <LinkButton href={CABINET_WALL}>{t("wall")}</LinkButton>
      <TextLink href={myGiftPath(personId)}>{t("myGift")}</TextLink>
    </div>
  );
}
