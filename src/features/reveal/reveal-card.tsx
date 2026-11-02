import { Gift, Heart, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import { cn } from "@/lib/utils";
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
      className={cn(
        "flex flex-col gap-1 rounded-2xl p-4 lg:gap-3 lg:p-6",
        tone === "yellow"
          ? "bg-santa-yellow text-santa-ink"
          : "bg-santa-mint text-santa-green",
      )}
    >
      <p className="font-heading text-base font-bold lg:text-2xl">{title}</p>
      <p
        className={cn(
          "text-sm leading-relaxed lg:text-base",
          tone === "mint" && "text-santa-muted",
        )}
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
  switcher,
}: {
  personId: string;
  reveal: Extract<RevealResult, { state: "ready" }>;
  /** «Сейчас играет» bar (phone: on top; desktop: right of the chip). */
  switcher?: React.ReactNode;
}) {
  const t = await getTranslations("reveal.card");
  const { santa } = reveal;
  const backup = santa === "backup";

  return (
    <div
      data-wide
      className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,704px)_minmax(0,384px)] lg:justify-between lg:gap-8"
    >
      <div className="flex flex-col gap-5 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="empty:hidden lg:order-last lg:shrink-0">{switcher}</div>
        <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full lg:hidden">
          {backup ? (
            <Heart className="size-6" aria-hidden />
          ) : (
            <Sparkles className="size-6" aria-hidden />
          )}
        </div>
        <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold lg:self-center">
          {t("chip")}
        </span>
      </div>

      {/* The mint panel of the mockup exists from `lg`; on a phone these are
          plain lines of the page. */}
      <div className="lg:bg-santa-mint flex flex-col gap-5 lg:col-span-2 lg:min-h-[405px] lg:flex-row lg:items-center lg:gap-8 lg:rounded-[20px] lg:p-12">
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:gap-6">
          {backup ? (
            <>
              <PageTitle className="lg:text-5xl">{t("backupTitle")}</PageTitle>
              <PageText className="lg:text-lg">{t("backupText")}</PageText>
            </>
          ) : (
            <>
              <PageTitle className="lg:text-5xl">
                {t("title", { name: santa.name })}
              </PageTitle>
              <PageText className="lg:text-lg">
                {t("text", { building: santa.building ?? "" })}
              </PageText>
            </>
          )}
        </div>
        <div className="hidden w-[432px] shrink-0 justify-center lg:flex">
          <div className="bg-santa-lime text-santa-green flex size-50 items-center justify-center rounded-full">
            {backup ? (
              <Heart className="size-20" aria-hidden />
            ) : (
              <Gift className="size-20" aria-hidden />
            )}
          </div>
        </div>
      </div>

      {backup ? (
        <Box
          tone="mint"
          title={t("backupBoxTitle")}
          text={t("backupBoxText")}
        />
      ) : (
        <>
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

      <div className="flex flex-col gap-5 lg:self-center">
        <LinkButton href={CABINET_WALL}>{t("wall")}</LinkButton>
        <TextLink href={myGiftPath(personId)}>{t("myGift")}</TextLink>
      </div>
    </div>
  );
}
