import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import {
  CABINET_WALL,
  giftPath,
  guessPath,
  myGiftPath,
  recipientPath,
  revealPath,
} from "@/lib/cabinet-routes";

export type HomePhase = "waiting" | "gifts" | "reveal";

export interface HomeViewProps {
  phase: HomePhase;
  person: { id: string; name: string };
  /** `none`: the recipient dropped out and nobody is left to give to. */
  recipient:
    | { state: "none" }
    | {
        state: "ready";
        name: string;
        building: string | null;
        apartment: string | null;
        reassigned: boolean;
        giftLeft: boolean;
      };
  /** What waits for this participant, as the receiver sees it. */
  myGift: "waiting" | "left" | "notFound";
  daysToGifts: number;
  canMark: boolean;
  canGuess: boolean;
  /** Already formatted dates, e.g. "25 декабря". */
  dates: { giftsStart: string; giftsEnd: string };
}

function Box({
  tone,
  title,
  text,
}: {
  tone: "yellow" | "mint";
  title: string;
  text?: string;
}) {
  return (
    <div
      className={`${tone === "yellow" ? "bg-santa-yellow text-santa-ink" : "bg-santa-mint text-santa-green"} flex flex-col gap-1 rounded-2xl p-4`}
    >
      <p className="text-base font-bold">{title}</p>
      {text ? (
        <p className="text-santa-ink text-sm leading-relaxed">{text}</p>
      ) : null}
    </div>
  );
}

function Block({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-santa-line flex flex-col gap-2 border-t pt-4">
      <h2 className="text-santa-ink text-base font-bold">{title}</h2>
      {text ? <PageText>{text}</PageText> : null}
      {children}
    </section>
  );
}

/**
 * "Дом" after the draw (frames mUkK6, dmFIt, gNnhD; spec 5, "Что на странице
 * «Дом» по этапам"): waiting, gifts and reveal each show their own blocks.
 * The collect phase is `HomeCollect` in the profile feature. Data comes in as
 * plain props, so the view has no queries of its own.
 */
export async function HomeView(props: HomeViewProps) {
  const { phase, person, recipient, myGift, dates } = props;
  const t = await getTranslations("cabinet.home");
  const id = person.id;
  const giftPrimary = phase === "gifts" && props.canMark;

  const chip = {
    waiting: t("chipWaiting", { date: dates.giftsStart }),
    gifts: t("chipGifts"),
    reveal: t("chipReveal"),
  }[phase];
  const title = {
    waiting: t("titleWaiting"),
    gifts: t("titleGifts"),
    reveal: t("titleReveal"),
  }[phase];

  return (
    <div className="flex flex-col gap-5">
      <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
        {chip}
      </span>
      <PageTitle>{title}</PageTitle>

      {phase === "waiting" ? (
        <Box
          tone="yellow"
          title={t("daysTitle", { days: props.daysToGifts })}
          text={t("daysText", { date: dates.giftsStart })}
        />
      ) : null}

      {phase === "gifts" &&
      recipient.state === "ready" &&
      !recipient.giftLeft ? (
        <Box
          tone="yellow"
          title={t("notLeftTitle")}
          text={t("notLeftText", { name: recipient.name })}
        />
      ) : null}
      {phase === "gifts" &&
      recipient.state === "ready" &&
      recipient.giftLeft ? (
        <Box
          tone="mint"
          title={t("leftTitle")}
          text={t("leftText", { date: dates.giftsEnd })}
        />
      ) : null}

      {phase === "reveal" ? (
        <LinkButton href={revealPath(id)}>{t("whoIsSanta")}</LinkButton>
      ) : recipient.state === "ready" ? (
        <>
          <section className="flex flex-col gap-1">
            <h2 className="text-santa-ink text-base font-bold">
              {t("recipient", { name: recipient.name })}
            </h2>
            <PageText>
              {t("address", {
                building: recipient.building ?? "",
                apartment: recipient.apartment ?? "",
              })}
            </PageText>
            {recipient.reassigned ? <PageText>{t("changed")}</PageText> : null}
          </section>
          {giftPrimary ? (
            <LinkButton href={giftPath(id)}>
              {recipient.giftLeft ? t("editGift") : t("leaveGift")}
            </LinkButton>
          ) : (
            <LinkButton href={recipientPath(id)}>
              {t("seeRecipient")}
            </LinkButton>
          )}
          {phase === "waiting" ? (
            <div
              aria-disabled="true"
              className="bg-santa-mint text-santa-muted flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold"
            >
              <span>{t("leaveGift")}</span>
              <Lock className="size-[18px]" aria-hidden />
            </div>
          ) : giftPrimary ? (
            <TextLink href={recipientPath(id)}>{t("seeRecipient")}</TextLink>
          ) : null}
        </>
      ) : (
        <Box tone="mint" title={t("noneTitle")} text={t("noneText")} />
      )}

      {phase !== "waiting" ? (
        <Block
          title={t(`myGift.${myGift}.title`)}
          text={t(`myGift.${myGift}.text`)}
        >
          <TextLink href={myGiftPath(id)}>{t("myGiftLink")}</TextLink>
        </Block>
      ) : null}

      {phase !== "waiting" ? (
        <Block title={t("wallTitle")} text={t("wallText")}>
          <TextLink href={CABINET_WALL}>{t("wallLink")}</TextLink>
        </Block>
      ) : null}

      {props.canGuess ? (
        <Block
          title={t("guessTitle")}
          text={
            phase === "waiting"
              ? t("guessText", { date: dates.giftsEnd })
              : undefined
          }
        >
          <TextLink href={guessPath(id)}>
            {phase === "waiting"
              ? t("guessLink")
              : t("guessLinkUntil", { date: dates.giftsEnd })}
          </TextLink>
        </Block>
      ) : null}
    </div>
  );
}
